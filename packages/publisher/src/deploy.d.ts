export type PublisherDeployTarget =
  | "none"
  | "github-pages"
  | "cloudflare-pages"
  | "custom";

export interface PublisherDeployConfig {
  target: PublisherDeployTarget;
  command: string;
  releaseDir: string;
  builtIn: boolean;
}

export function resolveDeployConfig(env?: NodeJS.ProcessEnv): PublisherDeployConfig;
export function runPublisherDeploy(options?: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  config?: PublisherDeployConfig;
}): Promise<{ skipped: boolean; target: string }>;
