package automation

import (
    "bufio"
    "context"
    "fmt"
    "log"
    "net"
    "os"
    "os/exec"
    "path"
    "strings"
    "sync"
    "time"
)

type ServerConfig struct {
    ID           string   `json:"id"`
    Hostname     string   `json:"hostname"`
    IP           string   `json:"ip"`
    Environment  string   `json:"environment"`
    SSHKeyPath   string   `json:"ssh_key_path"`
    SSHUser      string   `json:"ssh_user"`
    Port         int      `json:"port"`
    Tags         []string `json:"tags"`
    Labels       map[string]string `json:"labels"`
}

type DeploymentConfig struct {
    DeploymentID      string            `json:"deployment_id"`
    Environment       string            `json:"environment"`
    Servers           []ServerConfig    `json:"servers"`
    InstallScript     string            `json:"install_script"`
    PostInstallConfig  map[string]string `json:"post_install_config"`
    VerifyHealth      bool              `json:"verify_health"`
    MaxConcurrent     int              `json:"max_concurrent"`
    Timeout          time.Duration     `json:"timeout"`
    RetryPolicy      RetryPolicy       `json:"retry_policy"`
    Notifications     NotificationConfig `json:"notifications"`
}

type RetryPolicy struct {
    MaxRetries     int           `json:"max_retries"`
    RetryDelay     time.Duration `json:"retry_delay"`
    Exponential   bool         `json:"exponential"`
}

type NotificationConfig struct {
    Email         EmailConfig   `json:"email"`
    Webhook       WebhookConfig `json:"webhook"`
    Slack         SlackConfig   `json:"slack"`
}

type EmailConfig struct {
    Enabled       bool   `json:"enabled"`
    SMTPHost      string `json:"smtp_host"`
    SMTPPort      int    `json:"smtp_port"`
    Username      string `json:"username"`
    Password      string `json:"password"`
    From         string `json:"from"`
    To           []string `json:"to"`
}

type WebhookConfig struct {
    Enabled       bool   `json:"enabled"`
    URL           string `json:"url"`
    Secret        string `json:"secret"`
    Headers       map[string]string `json:"headers"`
}

type SlackConfig struct {
    Enabled       bool   `json:"enabled"`
    WebhookURL    string `json:"webhook_url"`
}

type DeploymentResult struct {
    DeploymentID   string           `json:"deployment_id"`
    ServerID       string           `json:"server_id"`
    Status         string           `json:"status"`
    Success        bool             `json:"success"`
    Output         string           `json:"output"`
    Duration       time.Duration    `json:"duration"`
    Error          error
    StartTime      time.Time        `json:"start_time"`
    EndTime        time.Time        `json:"end_time"`
    Retries        int              `json:"retries"`
    HealthStatus   string           `json:"health_status"`
    Checksum       string           `json:"checksum"`
}

type DeploymentService struct {
    config     *DeploymentConfig
    results    chan DeploymentResult
    wg         *sync.WaitGroup
    ctx        context.Context
    cancelFunc context.CancelFunc
}

func NewDeploymentService(config *DeploymentConfig) *DeploymentService {
    ctx, cancel := context.WithCancel(context.Background())
    return &DeploymentService{
        config:     config,
        results:    make(chan DeploymentResult),
        wg:         &sync.WaitGroup{},
        ctx:        ctx,
        cancelFunc: cancel,
    }
}

func (ds *DeploymentService) Deploy() ([]DeploymentResult, error) {
    defer close(ds.results)

    // Create worker pool for concurrent deployments
    workerCount := ds.config.MaxConcurrent
    if workerCount <= 0 {
        workerCount = 3
    }

    jobs := make(chan ServerConfig)
    resultsChan := make(chan DeploymentResult)

    // Start worker pool
    for i := 0; i < workerCount; i++ {
        ds.wg.Add(1)
        go ds.worker(jobs, resultsChan)
    }

    // Send jobs to workers
    for _, server := range ds.config.Servers {
        jobs <- server
    }
    close(jobs)

    // Collect results
    var deploymentResults []DeploymentResult
    for i := 0; i < len(ds.config.Servers); i++ {
        result := <-resultsChan
        deploymentResults = append(deploymentResults, result)
    }

    ds.wg.Wait()
    close(resultsChan)

    return deploymentResults, nil
}

func (ds *DeploymentService) worker(jobs <-chan ServerConfig, results chan<- DeploymentResult) {
    defer ds.wg.Done()

    for server := range jobs {
        if err := ds.ctx.Err() != nil {
            return
        }

        result := ds.deployToServer(server)
        results <- result
    }
}

func (ds *DeploymentService) deployToServer(server ServerConfig) DeploymentResult {
    startTime := time.Now()
    var lastError error

    // Try deployment with retries
    for retry := 0; retry <= ds.config.RetryPolicy.MaxRetries; retry++ {
        if retry > 0 {
            log.Printf("Retry %d/%d for server %s", retry, ds.config.RetryPolicy.MaxRetries, server.ID)
            
            // Exponential backoff
            delay := time.Duration(retry) * ds.config.RetryPolicy.RetryDelay
            if ds.config.RetryPolicy.Exponential {
                delay = time.Duration(1 << uint(retry)) * ds.config.RetryPolicy.RetryDelay
            }
            
            time.Sleep(delay)
        }

        result, err := ds.singleDeploy(server)
        if err == nil && (ds.config.VerifyHealth || !ds.config.VerifyHealth) {
            return result
        }
        
        lastError = err
        log.Printf("Deployment attempt %d failed for %s: %v", retry+1, server.ID, err)
    }

    return DeploymentResult{
        DeploymentID:   ds.config.DeploymentID,
        ServerID:       server.ID,
        Status:         "FAILED after retries",
        Success:        false,
        Output:         fmt.Sprintf("All deployment attempts failed. Last error: %v", lastError),
        Duration:      time.Since(startTime),
        Error:         lastError,
        StartTime:     startTime,
        EndTime:       time.Now(),
        Retries:       ds.config.RetryPolicy.MaxRetries,
        HealthStatus:  "unhealthy",
    }
}

func (ds *DeploymentService) singleDeploy(server ServerConfig) (DeploymentResult, error) {
    startTime := time.Now()

    // Step 1: Prepare remote environment
    envSetup, err := ds.prepareRemoteEnvironment(server)
    if err != nil {
        return DeploymentResult{
            DeploymentID:   ds.config.DeploymentID,
            ServerID:       server.ID,
            Status:         "Environment setup failed",
            Success:        false,
            Output:         fmt.Sprintf("Environment setup failed: %v", err),
            Duration:      time.Since(startTime),
            Error:         err,
            StartTime:     startTime,
            EndTime:       time.Now(),
            HealthStatus:  "unhealthy",
        }, err
    }

    // Step 2: Execute deployment script
    scriptResult, err := ds.executeDeploymentScript(server)
    if err != nil || !scriptResult.Success {
        return DeploymentResult{
            DeploymentID:   ds.config.DeploymentID,
            ServerID:       server.ID,
            Status:         "Script execution failed",
            Success:        false,
            Output:         fmt.Sprintf("Script execution failed: %v. Output: %s", err, scriptResult.Output),
            Duration:      time.Since(startTime),
            Error:         err,
            StartTime:     startTime,
            EndTime:       time.Now(),
            Retries:       1,
            HealthStatus:  "unhealthy",
        }, err
    }

    // Step 3: Post-deployment configuration
    postConfigResult := ds.postDeploymentConfiguration(server)

    // Step 4: Health verification
    var healthStatus string
    if ds.config.VerifyHealth {
        healthStatus, _ = ds.verifyAgentHealth(server)
    } else {
        healthStatus = "skipped"
    }

    // Calculate checksum
    checksum := ds.calculateDeploymentChecksum(server)

    status := "SUCCESS"
    if healthStatus != "healthy" {
        status = "SUCCESS with issues"
    }

    output := fmt.Sprintf("Deployment script output:\n%s\n\nPost-configuration:\n%s\n\nHealth Status: %s\nChecksum: %s",
        scriptResult.Output, postConfigResult.Output, healthStatus, checksum)

    return DeploymentResult{
        DeploymentID:   ds.config.DeploymentID,
        ServerID:       server.ID,
        Status:         status,
        Success:        healthStatus == "healthy",
        Output:         output,
        Duration:      time.Since(startTime),
        StartTime:     startTime,
        EndTime:       time.Now(),
        Retries:       0,
        HealthStatus:  healthStatus,
        Checksum:      checksum,
    }, nil
}

func (ds *DeploymentService) prepareRemoteEnvironment(server ServerConfig) (DeploymentResult, error) {
    log.Printf("Preparing environment on server %s (%s)...", server.ID, server.Hostname)

    // Create deployment script
    scriptPath := fmt.Sprintf("/tmp/deploy_securimon_%s.sh", server.ID)
    content := ds.generateDeploymentScript(server)
    
    err := os.WriteFile(scriptPath, []byte(content), 0755)
    if err != nil {
        return DeploymentResult{Success: false, Output: fmt.Sprintf("Failed to write deployment script: %v", err)}, err
    }

    // Connect to server and execute setup
    cmd := fmt.Sprintf("ssh -i %s -p %d %s@%s \"mkdir -p /opt/securimon \"",
        server.SSHKeyPath, server.Port, server.SSHUser, server.IP)

    output, err := ds.executeRemoteCommand(cmd)
    if err != nil {
        return DeploymentResult{Success: false, Output: fmt.Sprintf("Failed to prepare environment: %v. Output: %s", err, output)}, err
    }

    return DeploymentResult{Success: true, Output: fmt.Sprintf("Environment prepared on %s", server.Hostname)}, nil
}

func (ds *DeploymentService) executeDeploymentScript(server ServerConfig) (DeploymentResult, error) {
    log.Printf("Executing deployment script on %s...", server.ID)

    scriptPath := fmt.Sprintf("/tmp/deploy_securimon_%s.sh", server.ID)
    
    // Download and execute script via SSH
    cmd := fmt.Sprintf("ssh -i %s -p %d %s@%s \"chmod +x /tmp/deploy_securimon_%s.sh && /tmp/deploy_securimon_%s.sh\"",
        server.SSHKeyPath, server.Port, server.SSHUser, server.IP, server.ID, server.ID)

    output, err := ds.executeRemoteCommand(cmd)
    if err != nil {
        return DeploymentResult{Success: false, Output: fmt.Sprintf("Script execution failed: %v. Output: %s", err, output)}, err
    }

    // Poll for script completion
    success := ds.waitForScriptCompletion(server.ID, 300) // 5 minutes timeout
    if !success {
        return DeploymentResult{Success: false, Output: fmt.Sprintf("Script timeout or failed\nOutput: %s", output)}, fmt.Errorf("script timeout")
    }

    return DeploymentResult{Success: true, Output: fmt.Sprintf("Script executed successfully\nOutput: %s", output)}, nil
}

func (ds *DeploymentService) postDeploymentConfiguration(server ServerConfig) DeploymentResult {
    log.Printf("Configuring post-deployment on %s...", server.ID)

    var outputs []string

    // Run post-configuration scripts
    scripts := []string{"apply_config.sh", "setup_services.sh", "configure_monitoring.sh"}
    for _, script := fast.(range scripts) {
        cmd := fmt.Sprintf("ssh -i %s -p %d %s@%s \"bash -s\"", server.SSHKeyPath, server.Port, server.SSHUser, server.IP)
        
        output, err := ds.executeRemoteCommandWithInput(cmd, scriptContent(script), 60)
        if err != nil {
            outputs = append(outputs, fmt.Sprintf("%s failed: %v", script, err))
        } else {
            outputs = append(outputs, fmt.Sprintf("%s succeeded", script))
        }
    }

    result := strings.Join(outputs, "\n")
    if len(outputs) == 0 {
        result = "No post-configuration scripts executed"
    }

    return DeploymentResult{Success: true, Output: result}
}

func (ds *DeploymentService) verifyAgentHealth(server ServerConfig) (string, error) {
    log.Printf("Verifying agent health on %s...", server.ID)

    // Try to connect to health endpoint
    cmd := fmt.Sprintf("curl -s -o /dev/null -w '%%{{http_code}}' http://%s:8080/health?server_id=%s",
        server.IP, server.ID)

    output, err := ds.executeRemoteCommand(cmd)
    if err != nil {
        return "error", fmt.Errorf("health check failed: %v", err)
    }

    statusCode := strings.TrimSpace(string(output))
    if statusCode == "200" || statusCode == "201" {
        return "healthy", nil
    } else {
        return fmt.Sprintf("unhealthy (HTTP %s)", statusCode), fmt.Errorf("health check failed with status %s", statusCode)
    }
}

func (ds *DeploymentService) calculateDeploymentChecksum(server ServerConfig) string {
    // Calculate a checksum based on server configuration and deployment result
    checksum := fmt.Sprintf("D%s-%s-%s-%s",
        server.ID, server.Hostname, server.Environment, server.IP)
    
    // Add server tags to checksum
    if len(server.Tags) > 0 {
        checksum += "-T"
        for _, tag := range server.Tags {
            checksum += "-" + tag
        }
    }
    
    return checksum
}

func (ds *DeploymentService) executeRemoteCommand(cmd string) (string, error) {
    // Execute remote command and return output
    execCmd := exec.Command("bash", "-c", cmd)
    output, err := execCmd.CombinedOutput()
    return string(output), err
}

func (ds *DeploymentService) executeRemoteCommandWithInput(cmd, input string, timeoutSeconds int) (string, error) {
    // Execute remote command with input and timeout
    execCmd := exec.Command("bash")
    execCmd.Args = []string{"-", "c"}
    
    stdin, err := execCmd.StdinPipe()
    if err != nil {
        return "", err
    }
    
    stdout, err := execCmd.StdoutPipe()
    if err != nil {
        return "", err
    }
    
    stderr, err := execCmd.StderrPipe()
    if err != nil {
        return "", err
    }
    
    if err := execCmd.Start(); err != nil {
        return "", err
    }
    
    // Write input to stdin
    _, err = stdin.Write([]byte(input))
    if err != nil {
        execCmd.Wait()
        return "", err
    }
    
    err = stdin.Close()
    if err != nil {
        execCmd.Wait()
        return "", err
    }
    
    // Wait with timeout
    done := make(chan error)
    go func() {
        done <- execCmd.Wait()
    }()
    
    select {
    case <-done:
        // Command completed
    case <-time.After(time.Duration(timeoutSeconds) * time.Second):
        // Timeout
        execCmd.Process.Kill()
        return "", fmt.Errorf("command timed out after %d seconds", timeoutSeconds)
    }
    }
    
    // Read output
    outputBytes, err := io.ReadAll(stdout)
    if err != nil {
        return "", err
    }
    
    return string(outputBytes), nil
}

func (ds *DeploymentService) generateDeploymentScript(server ServerConfig) string {
    script := fmt.Sprintf(`#!/bin/bash
set -e

echo "Starting SecuriMon agent deployment on %s"
echo "Server ID: %s"
echo "Environment: %s"
echo "Hostname: %s"

# Environment variables
export SECURIMON_SERVER_ID="%s"
export SECURIMON_BACKEND_URL="%s"
export SECURIMON_INSTALL_TOKEN="%s"
export SECURIMON_ENVIRONMENT="%s"
export SECURIMON_DEPLOYMENT_MODE="deployment"

# Create installation directory
mkdir -p /opt/securimon
cd /opt/securimon

# Download SecuriMon agent (you would replace this with actual download logic)
echo "Downloading SecuriMon agent..."

cat > install.py << 'EOF'
import subprocess
import sys

subprocess.run(["pip", "install", "-r", "requirements.txt"], check=True)
subprocess.run(["cp", "src/securimon.py", "/usr/local/bin/securimon"], check=True)
subprocess.run(["chmod", "+x", "/usr/local/bin/securimon"], check=True)
EOF

python3 install.py

# Configure systemd service
cat > /etc/systemd/system/securimon.service << 'EOF'
[Unit]
Description=SecuriMon Agent
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/securimon
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=securimon

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable securimon
systemctl start securimon

# Configure firewall if needed
if command -v ufw &> /dev/null; then
    echo "Configuring firewall..."
    ufw --force enable
fi

# Configure SSH if needed
if [ -f /etc/ssh/sshd_config ]; then
    echo "Configuring SSH..."
    sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/g' /etc/ssh/sshd_config
    systemctl restart sshd
fi

echo "SecuriMon agent deployment completed successfully"
`, server.ID, server.ID, server.Environment, server.Hostname, server.ID, ds.config.BackendURL, ds.config.InstallToken, server.Environment)

    return script
}

func scriptContent(script string) string {
    switch script {
    case "apply_config.sh":
        return `#!/bin/bash
echo "Applying configuration..."
mkdir -p /etc/securimon
cat > /etc/securimon/config.yaml << 'EOF'
server_id: "SERVER_ID"
backend_url: "BACKEND_URL"
environment: "ENVIRONMENT"
EOF
sed -i "s/SERVER_ID/$(SERVER_ID)/g" /etc/securimon/config.yaml
sed -i "s/BACKEND_URL/$(BACKEND_URL)/g" /etc/securimon/config.yaml
sed -i "s/ENVIRONMENT/$(ENVIRONMENT)/g" /etc/securimon/config.yaml

echo "Configuration applied successfully"
`
    case "setup_services.sh":
        return `#!/bin/bash
echo "Setting up services..."
# Enable and start required services
systemctl enable ssh
systemctl start ssh
if command -v ufw &> /dev/null; then
    ufw --force enable
fi
echo "Services setup completed"
`
    case "configure_monitoring.sh":
        return `#!/bin/bash
echo "Configuring monitoring..."
# Install monitoring tools
if command -v apt-get &> /dev/null; then
    apt-get update
    apt-get install -y htop iotop nethogs
fi

# Configure log rotation
mkdir -p /etc/logrotate.d/securimon
cat > /etc/logrotate.d/securimon << 'EOF'
/var/log/securimon/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 0644 root root
}
EOF

echo "Monitoring configuration completed"
`
    default:
        return ""
    }
}
