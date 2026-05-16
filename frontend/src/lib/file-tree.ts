export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children: TreeNode[];
}

export function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const path of paths) {
    const parts = path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const currentPath = parts.slice(0, i + 1).join('/');
      const isFile = i === parts.length - 1;

      let node = current.find((n) => n.name === part);
      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          children: [],
        };
        current.push(node);
      }
      if (!isFile) {
        current = node.children;
      }
    }
  }

  return sortTree(root);
}

function sortTree(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .map((n) => ({ ...n, children: sortTree(n.children) }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function getParentPath(path: string): string {
  const parts = path.split('/');
  return parts.slice(0, -1).join('/');
}

export function getFileName(path: string): string {
  return path.split('/').pop() || path;
}

export function getDisplayName(name: string): string {
  return name.replace(/\.md$/, '');
}
