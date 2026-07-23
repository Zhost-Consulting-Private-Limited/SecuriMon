export type DeploymentMode = 'self_hosted' | 'saas';

export function getDeploymentMode(): DeploymentMode {
  return process.env.DEPLOYMENT_MODE === 'saas' ? 'saas' : 'self_hosted';
}

export function isSaas(): boolean {
  return getDeploymentMode() === 'saas';
}
