// Toggle expand/collapse
function toggleBlog(header) {
  const card = header.closest('.blog-card');
  const isExpanded = card.dataset.expanded === 'true';
  card.dataset.expanded = isExpanded ? 'false' : 'true';
}

// Share button — copies link with hash to clipboard
function sharePost(event, slug) {
  event.stopPropagation(); // don't toggle the card

  const url = window.location.origin + window.location.pathname + '#' + slug;

  navigator.clipboard.writeText(url).then(function () {
    const btn = event.currentTarget;
    btn.classList.add('copied');
    setTimeout(function () { btn.classList.remove('copied'); }, 2000);
  }).catch(function () {
    // fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);

    const btn = event.currentTarget;
    btn.classList.add('copied');
    setTimeout(function () { btn.classList.remove('copied'); }, 2000);
  });
}

// On page load: if there's a hash, expand only that post and scroll to it
(function () {
  var hash = window.location.hash.slice(1); // strip the #
  if (!hash) return;

  var target = document.getElementById(hash);
  if (!target) return;

  // Expand just this one
  target.dataset.expanded = 'true';

  // Scroll to it after a short delay (let page render)
  setTimeout(function () {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);
})();
