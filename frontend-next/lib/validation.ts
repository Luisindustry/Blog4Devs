// Single source of truth for client-side validation limits.
// Mirrors the backend (backend-fastapi/app/models/schemas.py); keep in sync.
export const QUESTION_TITLE_MIN = 10;
export const QUESTION_TITLE_MAX = 180;
export const QUESTION_CONTENT_MIN = 30;
export const QUESTION_TAGS_MAX = 8;
export const ANSWER_CONTENT_MIN = 20;
