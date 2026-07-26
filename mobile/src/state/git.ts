import { create } from 'zustand';

interface GitStatus {
  current?: string | null;
  files: unknown[];
}

interface PullRequestSummary {
  number: number;
  title: string;
  state: string;
}

interface PullRequestDetail {
  number: number;
  title: string;
  body: string;
  state: string;
}

interface GitState {
  status: GitStatus;
  diffText: string;
  feedback: string | null;
  branches: string[];
  pullRequests: PullRequestSummary[];
  pullRequestDetail: PullRequestDetail | null;
  pullRequestFeedback: string | null;
  setStatus: (status: GitStatus) => void;
  setDiffText: (text: string) => void;
  setFeedback: (feedback: string | null) => void;
  setBranches: (branches: string[]) => void;
  setPullRequests: (prs: PullRequestSummary[]) => void;
  setPullRequestDetail: (detail: PullRequestDetail | null) => void;
  setPullRequestFeedback: (feedback: string | null) => void;
}

export const useGitStore = create<GitState>((set) => ({
  status: { files: [] },
  diffText: '',
  feedback: null,
  branches: [],
  pullRequests: [],
  pullRequestDetail: null,
  pullRequestFeedback: null,
  setStatus: (status) => set({ status }),
  setDiffText: (diffText) => set({ diffText }),
  setFeedback: (feedback) => set({ feedback }),
  setBranches: (branches) => set({ branches }),
  setPullRequests: (pullRequests) => set({ pullRequests }),
  setPullRequestDetail: (pullRequestDetail) => set({ pullRequestDetail }),
  setPullRequestFeedback: (pullRequestFeedback) => set({ pullRequestFeedback }),
}));
