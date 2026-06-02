export type UserRole = "junior" | "senior" | "admin";
export type QuestionStatus = "pending" | "approved" | "rejected";

export type Author = {
  user_id: string;
  username: string;
  role: UserRole;
};

export type Answer = {
  answer_id: string;
  content: string;
  author: Author;
  is_accepted: boolean;
  created_at: string;
};

export type Question = {
  id: string;
  title: string;
  slug: string;
  content: string;
  author: Author;
  tags: string[];
  status: QuestionStatus;
  votes: number;
  answers: Answer[];
  created_at: string;
};

export type QuestionSummary = {
  id: string;
  title: string;
  slug: string;
  author: Author;
  tags: string[];
  status: QuestionStatus;
  votes: number;
  answers_count: number;
  created_at: string;
};

export type QuestionListResponse = {
  items: QuestionSummary[];
  total: number;
  skip: number;
  limit: number;
};

export type AnswerCreate = {
  content: string;
  author: Author;
};

export type QuestionCreate = {
  title: string;
  content: string;
  author: Author;
  tags: string[];
};
