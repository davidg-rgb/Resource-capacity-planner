// v5.0 — FOUND-V5-04: local re-export of change_log schema symbols
// Gives downstream services a stable module-local import path
// per ARCHITECTURE §6 module layout conventions.
export { changeLog, changeLogActionEnum, changeLogEntityEnum } from '@/db/schema';
