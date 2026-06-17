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
};

export type QuestionCreate = {
  title: string;
  content: string;
  tags: string[];
};

export type ChatParticipant = {
  user_id: string;
  username: string;
};

export type Conversation = {
  id: string;
  participants: ChatParticipant[];
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender: ChatParticipant;
  content: string;
  created_at: string;
};
