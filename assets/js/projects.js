/* ============================================================
   projects.js — search, sort, tag filter + MathJax re-typeset
   (mirrors blog.js, scoped to .project-card)
   ============================================================ */

/* ── Toggle expand / collapse ── */
function toggleProject(header) {
  var card = header.closest('.project-card');
  var isExpanded = card.dataset.expanded === 'true';
  card.dataset.expanded = isExpanded ? 'false' : 'true';

  /* Re-typeset math inside this card once it's visible */
  if (!isExpanded && window.MathJax && MathJax.typesetPromise) {
    MathJax.typesetPromise([card]).catch(function(err) {
      console.warn('MathJax typeset error:', err);
    });
  }
}

/* ── Hash → auto-expand on load ── */
(function() {
  var hash = window.location.hash.slice(1);
  if (!hash) return;
  var target = document.getElementById(hash);
  if (!target) return;
  target.dataset.expanded = 'true';
  if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([target]);
  setTimeout(function() { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150);
})();

/* ============================================================
   Search / Sort / Tag system
   ============================================================ */
(function() {
  var currentSort = 'newest';
  var activeTags = new Set();
  var openPanel   = null;

  var posts = Array.from(document.querySelectorAll('.project-card'));

  /* ── Panel toggle ── */
  function togglePanel(name) {
    var panel = document.getElementById('vr-' + name + '-panel');
    var btn   = document.getElementById('vr-' + name + '-btn');

    if (openPanel === name) {
      panel.classList.remove('open');
      btn.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
      openPanel = null;
      return;
    }
    if (openPanel) {
      document.getElementById('vr-' + openPanel + '-panel').classList.remove('open');
      document.getElementById('vr-' + openPanel + '-btn').classList.remove('active');
      document.getElementById('vr-' + openPanel + '-btn').setAttribute('aria-expanded', 'false');
    }
    panel.classList.add('open');
    btn.classList.add('active');
    btn.setAttribute('aria-expanded', 'true');
    openPanel = name;
  }

  document.getElementById('vr-sort-btn').addEventListener('click', function() { togglePanel('sort'); });
  document.getElementById('vr-tags-btn').addEventListener('click', function() { togglePanel('tags'); });

  /* ── Sort chips ── */
  document.querySelectorAll('[data-sort]').forEach(function(chip) {
    chip.addEventListener('click', function() {
      document.querySelectorAll('[data-sort]').forEach(function(c) { c.classList.remove('sort-active'); });
      chip.classList.add('sort-active');
      currentSort = chip.dataset.sort;
      document.getElementById('vr-sort-btn').classList.toggle('has-active', currentSort !== 'newest');
      apply();
    });
  });

  /* ── Tag chips ── */
   document.querySelectorAll('[data-tag]').forEach(function(chip) {
     chip.addEventListener('click', function() {
       var tag = chip.dataset.tag;
       if (tag === 'all') {
         activeTags.clear();
         document.querySelectorAll('[data-tag]').forEach(function(c) { c.classList.remove('tag-active'); });
         chip.classList.add('tag-active');
       } else {
         document.querySelector('[data-tag="all"]').classList.remove('tag-active');
         if (activeTags.has(tag)) {
           activeTags.delete(tag);
           chip.classList.remove('tag-active');
           if (activeTags.size === 0) document.querySelector('[data-tag="all"]').classList.add('tag-active');
         } else {
           activeTags.add(tag);
           chip.classList.add('tag-active');
         }
       }
       document.getElementById('vr-tags-btn').classList.toggle('has-active', activeTags.size > 0);
       apply();
     });
   });

  /* ── Search input ── */
  var searchInput = document.getElementById('vr-search-input');
  var searchClear = document.getElementById('vr-search-clear');

  searchInput.addEventListener('input', function() {
    searchClear.classList.toggle('visible', this.value.length > 0);
    apply();
  });

  searchClear.addEventListener('click', function() {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    apply();
  });

  /* ── Active filter pills ── */
   function renderActivePills() {
     var container = document.getElementById('vr-active-filters');
     container.innerHTML = '';
     activeTags.forEach(function(tag) {
       var pill = document.createElement('span');
       pill.className = 'vr-af-pill';
       pill.innerHTML = tag + ' <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>';
       pill.addEventListener('click', function() {
         activeTags.delete(tag);
         var chip = document.querySelector('[data-tag="' + tag + '"]');
         if (chip) chip.classList.remove('tag-active');
         if (activeTags.size === 0) document.querySelector('[data-tag="all"]').classList.add('tag-active');
         document.getElementById('vr-tags-btn').classList.toggle('has-active', activeTags.size > 0);
         apply();
       });
       container.appendChild(pill);
     });
   }

  /* ── Main apply ── */
  function apply() {
    var q = searchInput.value.toLowerCase().trim();

    var visible = posts.filter(function(p) {
      var postTags = JSON.parse(p.dataset.tags);
      var tagMatch = activeTags.size === 0 || postTags.some(function(t) { return activeTags.has(t); });
      var textMatch = !q || p.dataset.title.indexOf(q) !== -1 || p.dataset.tags.indexOf(q) !== -1;
      return tagMatch && textMatch;
    });

    visible.sort(function(a, b) {
      if (currentSort === 'newest') return parseInt(b.dataset.ts) - parseInt(a.dataset.ts);
      if (currentSort === 'oldest') return parseInt(a.dataset.ts) - parseInt(b.dataset.ts);
      if (currentSort === 'az')     return a.dataset.title.localeCompare(b.dataset.title);
      if (currentSort === 'za')     return b.dataset.title.localeCompare(a.dataset.title);
      return 0;
    });

    var list = document.querySelector('.page.active');
    var visSet = new Set(visible);

    /* Re-order visible posts in DOM */
    var insertBefore = document.getElementById('vr-empty-state');
    visible.forEach(function(p) { list.insertBefore(p, insertBefore); });

    posts.forEach(function(p) {
      if (visSet.has(p)) {
        p.classList.remove('vr-hidden');
      } else {
        p.classList.add('vr-hidden');
      }
    });

    var c = visible.length;
    document.getElementById('vr-result-count').textContent = c + ' project' + (c !== 1 ? 's' : '');
    document.getElementById('vr-empty-state').classList.toggle('visible', c === 0);

    renderActivePills();
  }

})();
