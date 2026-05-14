function toggleBlog(header) {
  const card = header.closest('.blog-card');
  const isExpanded = card.dataset.expanded === 'true';
  card.dataset.expanded = isExpanded ? 'false' : 'true';
}
