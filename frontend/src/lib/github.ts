import { Octokit } from 'octokit';
import yaml from 'js-yaml';
import { Note, NoteType } from './store';

export class GithubClient {
  private octokit: Octokit | null = null;
  private owner: string = '';
  private repo: string = '';
  private branch: string = 'main';

  initialize(pat: string, owner: string, repo: string, branch: string = 'main') {
    this.octokit = new Octokit({ auth: pat });
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
  }

  isInitialized() {
    return this.octokit !== null && this.owner !== '' && this.repo !== '';
  }

  async testConnection() {
    if (!this.octokit) throw new Error('Octokit not initialized');
    const response = await this.octokit.rest.repos.get({
      owner: this.owner,
      repo: this.repo,
    });
    return response.data;
  }

  async getTree() {
    if (!this.octokit) throw new Error('Octokit not initialized');
    try {
      const branchData = await this.octokit.rest.repos.getBranch({
        owner: this.owner,
        repo: this.repo,
        branch: this.branch,
      });
      const treeSha = branchData.data.commit.commit.tree.sha;
      const treeData = await this.octokit.rest.git.getTree({
        owner: this.owner,
        repo: this.repo,
        tree_sha: treeSha,
        recursive: 'true',
      });
      return treeData.data.tree;
    } catch (e) {
      console.error('Error getting tree', e);
      return [];
    }
  }

  async getFile(path: string) {
    if (!this.octokit) throw new Error('Octokit not initialized');
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: this.branch,
      });

      if ('content' in response.data) {
        return {
          content: atob(response.data.content.replace(/\n/g, '')),
          sha: response.data.sha,
        };
      }
      throw new Error('Not a file');
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  async saveFile(
    path: string,
    content: string,
    sha?: string,
    message: string = 'Update note'
  ) {
    if (!this.octokit) throw new Error('Octokit not initialized');
    const response = await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path,
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      sha,
      branch: this.branch,
    });
    return response.data.content?.sha;
  }

  async deleteFile(path: string, sha: string, message?: string) {
    if (!this.octokit) throw new Error('Octokit not initialized');
    await this.octokit.rest.repos.deleteFile({
      owner: this.owner,
      repo: this.repo,
      path,
      message: message || `Delete ${path}`,
      sha,
      branch: this.branch,
    });
  }

  async createFolder(folderPath: string) {
    // GitHub doesn't have real folders — create a .gitkeep placeholder
    const keepPath = `${folderPath}/.gitkeep`;
    await this.saveFile(keepPath, '', undefined, `Create folder ${folderPath}`);
    return keepPath;
  }

  async renameFile(oldPath: string, newPath: string, content: string, sha: string) {
    // Create at new path, then delete old
    await this.saveFile(newPath, content, undefined, `Rename ${oldPath} to ${newPath}`);
    await this.deleteFile(oldPath, sha, `Rename ${oldPath} to ${newPath}`);
  }

  parseMarkdown(
    content: string,
    path: string,
    position: { x: number; y: number } = { x: 0, y: 0 },
    sha?: string
  ): Note {
    const defaultNote: Note = {
      path,
      title: path.split('/').pop()?.replace('.md', '') || 'Untitled',
      content: content,
      type: 'research',
      tags: [],
      connections: [],
      position,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sha,
    };

    try {
      const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      if (match) {
        const frontmatterStr = match[1];
        const body = match[2];
        const frontmatter = yaml.load(frontmatterStr) as any;
        const wikiConnections = Array.from(body.matchAll(/\[\[(.*?)\]\]/g)).map(
          (m) => m[1]
        );

        return {
          ...defaultNote,
          title: frontmatter.title || defaultNote.title,
          content: body.trim(),
          type: (frontmatter.type as NoteType) || 'research',
          tags: frontmatter.tags || [],
          aiAnnotation: frontmatter.aiAnnotation,
          summary: frontmatter.summary,
          connections: [
            ...new Set([...(frontmatter.connections || []), ...wikiConnections]),
          ],
          position: frontmatter.position || position,
        };
      }
    } catch (e) {
      console.warn('Failed to parse frontmatter for', path);
    }

    const wikiConnections = Array.from(content.matchAll(/\[\[(.*?)\]\]/g)).map(
      (m) => m[1]
    );
    return { ...defaultNote, connections: wikiConnections };
  }

  serializeMarkdown(note: Note): string {
    const frontmatter: Record<string, any> = {
      title: note.title,
      type: note.type,
    };
    if (note.tags.length > 0) frontmatter.tags = note.tags;
    if (note.aiAnnotation) frontmatter.aiAnnotation = note.aiAnnotation;
    if (note.summary) frontmatter.summary = note.summary;
    if (note.connections.length > 0) frontmatter.connections = note.connections;
    frontmatter.position = note.position;

    const yamlStr = yaml.dump(frontmatter);
    return `---\n${yamlStr}---\n\n${note.content}`;
  }

  async syncAllNotes(
    existingPositions: Record<string, { x: number; y: number }> = {}
  ) {
    const tree = await this.getTree();
    const mdFiles = tree.filter(
      (item) =>
        item.path?.endsWith('.md') && !item.path?.includes('.gitkeep')
    );

    const notes: Record<string, Note> = {};
    let col = 0;

    for (const file of mdFiles) {
      if (!file.path) continue;
      const fileData = await this.getFile(file.path);
      if (fileData) {
        const pos = existingPositions[file.path] || {
          x: (col % 4) * 320 - 480,
          y: Math.floor(col / 4) * 340 - 200,
        };
        col++;
        notes[file.path] = this.parseMarkdown(
          fileData.content,
          file.path,
          pos,
          fileData.sha
        );
      }
    }

    return notes;
  }

  /** Get all paths in the repo (files + folder prefixes) */
  async getAllPaths(): Promise<string[]> {
    const tree = await this.getTree();
    return tree
      .filter((item) => item.path && !item.path.includes('.gitkeep'))
      .map((item) => item.path!);
  }
}

export const githubClient = new GithubClient();
