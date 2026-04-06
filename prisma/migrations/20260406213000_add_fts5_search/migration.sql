-- Create FTS5 virtual table for article search
CREATE VIRTUAL TABLE IF NOT EXISTS ArticleFts USING fts5(
  title,
  content,
  content='Article',
  content_rowid='rowid'
);

-- Populate FTS index with existing articles
INSERT INTO ArticleFts(rowid, title, content)
SELECT rowid, title, content FROM Article;

-- Trigger to keep FTS index in sync on INSERT
CREATE TRIGGER article_fts_insert AFTER INSERT ON Article BEGIN
  INSERT INTO ArticleFts(rowid, title, content)
  VALUES (new.rowid, new.title, new.content);
END;

-- Trigger to keep FTS index in sync on UPDATE
CREATE TRIGGER article_fts_update AFTER UPDATE OF title, content ON Article BEGIN
  INSERT INTO ArticleFts(ArticleFts, rowid, title, content)
  VALUES ('delete', old.rowid, old.title, old.content);
  INSERT INTO ArticleFts(rowid, title, content)
  VALUES (new.rowid, new.title, new.content);
END;

-- Trigger to keep FTS index in sync on DELETE
CREATE TRIGGER article_fts_delete AFTER DELETE ON Article BEGIN
  INSERT INTO ArticleFts(ArticleFts, rowid, title, content)
  VALUES ('delete', old.rowid, old.title, old.content);
END;
