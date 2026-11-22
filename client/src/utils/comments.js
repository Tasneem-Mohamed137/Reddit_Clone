// Turns the flat list from the API into a tree. The server already sorted the list,
// so children keep that order inside each parent.
export const buildTree = (flat) => {
  const nodes = new Map(flat.map((c) => [c.id, { ...c, children: [] }]));
  const roots = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : null;
    (parent ? parent.children : roots).push(node);
  }
  return roots;
};

export const countDescendants = (node) =>
  node.children.reduce((total, child) => total + 1 + countDescendants(child), 0);