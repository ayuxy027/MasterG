export const getOrCreateUserId = (storageKey = "masterji_userId"): string => {
  const stored = localStorage.getItem(storageKey);
  if (stored) return stored;
  const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  localStorage.setItem(storageKey, newId);
  return newId;
};

export const generateSessionId = (prefix = "session"): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
