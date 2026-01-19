export interface Proposal {
  id: number;
  created_at: string;
  "PROPOSAL DATA": string | null;
  STATUS: string | null;
}

export interface ProposalViewerProps {
  proposalData: string;
  proposalId: number;
}
