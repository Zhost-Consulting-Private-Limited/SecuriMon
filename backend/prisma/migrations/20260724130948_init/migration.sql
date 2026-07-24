-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "parentMspTenantId" TEXT,
    "whiteLabelConfig" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tenant_parentMspTenantId_fkey" FOREIGN KEY ("parentMspTenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InstallToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "InstallToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "os" TEXT,
    "osVersion" TEXT,
    "kernelVersion" TEXT,
    "cloudProvider" TEXT,
    "publicIp" TEXT,
    "privateIp" TEXT,
    "environment" TEXT,
    "project" TEXT,
    "region" TEXT,
    "customerLabel" TEXT,
    "tags" TEXT,
    "desiredConfig" TEXT,
    "apiKeyHash" TEXT NOT NULL,
    "agentVersion" TEXT,
    "lastSeenAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Server_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServerInventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "softwareName" TEXT NOT NULL,
    "version" TEXT,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServerInventory_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MetricsRaw" (
    "serverId" TEXT NOT NULL,
    "collectedAt" DATETIME NOT NULL,
    "cpuPercent" REAL,
    "ramPercent" REAL,
    "diskPercent" REAL,
    "swapPercent" REAL,
    "load1m" REAL,
    "load5m" REAL,
    "load15m" REAL,
    "networkRxBytes" BIGINT,
    "networkTxBytes" BIGINT,
    "temperatureC" REAL,

    PRIMARY KEY ("serverId", "collectedAt"),
    CONSTRAINT "MetricsRaw_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Metrics5m" (
    "serverId" TEXT NOT NULL,
    "collectedAt" DATETIME NOT NULL,
    "cpuPercent" REAL,
    "ramPercent" REAL,
    "diskPercent" REAL,
    "swapPercent" REAL,
    "load1m" REAL,
    "load5m" REAL,
    "load15m" REAL,
    "networkRxBytes" BIGINT,
    "networkTxBytes" BIGINT,
    "temperatureC" REAL,

    PRIMARY KEY ("serverId", "collectedAt"),
    CONSTRAINT "Metrics5m_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MetricsHourly" (
    "serverId" TEXT NOT NULL,
    "collectedAt" DATETIME NOT NULL,
    "cpuPercent" REAL,
    "ramPercent" REAL,
    "diskPercent" REAL,
    "swapPercent" REAL,
    "load1m" REAL,
    "load5m" REAL,
    "load15m" REAL,
    "networkRxBytes" BIGINT,
    "networkTxBytes" BIGINT,
    "temperatureC" REAL,

    PRIMARY KEY ("serverId", "collectedAt"),
    CONSTRAINT "MetricsHourly_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "managerType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "port" INTEGER,
    "version" TEXT,
    "status" TEXT,
    "restartCount24h" INTEGER NOT NULL DEFAULT 0,
    "lastRestartAt" DATETIME,
    CONSTRAINT "Application_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SecurityScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "riskScore" INTEGER,
    CONSTRAINT "SecurityScan_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SecurityFinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scanId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "autoFixable" BOOLEAN NOT NULL DEFAULT false,
    "businessImpactText" TEXT,
    "recommendedAction" TEXT,
    "estimatedFixTime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "detail" TEXT,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityFinding_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "SecurityScan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SecurityFinding_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ThreatEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "sourceIp" TEXT,
    "detail" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "autoRemediated" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ThreatEvent_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "eventCategory" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimelineEvent_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RemediationAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "triggerRefId" TEXT,
    "action" TEXT NOT NULL,
    "params" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "initiatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "RemediationAction_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RemediationPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "autoEnabled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "RemediationPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "serverId" TEXT,
    "metric" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "channels" TEXT NOT NULL,
    "severityRouting" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "AlertRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AlertRule_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlertHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alertRuleId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "firedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "deliveryStatus" TEXT,
    CONSTRAINT "AlertHistory_alertRuleId_fkey" FOREIGN KEY ("alertRuleId") REFERENCES "AlertRule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AlertHistory_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComplianceReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "serverId" TEXT,
    "framework" TEXT NOT NULL,
    "score" INTEGER,
    "pdfUrl" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplianceReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ComplianceReport_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BackupStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "lastBackupAt" DATETIME,
    "backupSizeBytes" BIGINT,
    "restoreTested" BOOLEAN DEFAULT false,
    "cloudSynced" BOOLEAN DEFAULT false,
    "lastFailureAt" DATETIME,
    "lastFailureReason" TEXT,
    CONSTRAINT "BackupStatus_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CostRecommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "estimatedMonthlySavings" REAL,
    "currency" TEXT DEFAULT 'USD',
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'open',
    CONSTRAINT "CostRecommendation_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServerScore" (
    "serverId" TEXT NOT NULL,
    "scoredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "healthScore" INTEGER,
    "performanceScore" INTEGER,
    "securityScore" INTEGER,
    "complianceScore" INTEGER,
    "availabilityScore" INTEGER,
    "backupScore" INTEGER,
    "overallScore" INTEGER,
    "scoringAlgorithmVersion" TEXT NOT NULL,

    PRIMARY KEY ("serverId", "scoredAt"),
    CONSTRAINT "ServerScore_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "InstallToken_token_key" ON "InstallToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Application_serverId_name_key" ON "Application"("serverId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "BackupStatus_serverId_key" ON "BackupStatus"("serverId");

