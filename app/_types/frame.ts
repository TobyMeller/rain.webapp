export type FrameState = {
  strategyName: string | null;
  strategyDescription: string | null;
  currentStep: string;
  deploymentOption: any;
  bindings: any;
  deposit: number | null;
  buttonPage: number;
  textInputLabel: string;
  error: string | null;
  requiresTokenApproval: boolean;
  tokensApproved?: boolean;
  isWebapp?: boolean;
};
