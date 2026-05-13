/* ============================================================
   PORTFOLIO — app.js
   Navigation · Blog system · Tag filtering · Contact form
   ============================================================ */

'use strict';


/* ================================================================
   BLOG POSTS DATA
   ================================================================
   TO ADD A POST — copy any post object below, paste after it,
   change the fields. Tags are auto-discovered from all posts.
   
   Fields:
     id       : unique string (no spaces)
     title    : string
     date     : "YYYY-MM-DD"
     tags     : array of lowercase strings  ← add any tag you want here
     excerpt  : string shown on the card
     content  : HTML string shown in the full post view
   ================================================================ */

const POSTS = [
  {
    id: 'post-rocket',
    title: 'I Watched a Rocket Explode and Called It Field Research',
    date: '2025-04-22',
    tags: ['aerospace', 'silly', 'observations'],
    excerpt:
      'There\'s something deeply educational about watching a $300M vehicle become confetti at Mach 2. My professor disagrees that "watching YouTube" counts as lab hours — but I\'ve drafted a compelling argument.',
    content: `
      <p>Let me set the scene. It's 2am. I have a fluid mechanics problem set due in six hours.
      And instead of solving it, I'm watching a launch attempt on a stream with 40,000 other people
      who are also definitely not doing their assignments.</p>

      <p>The thing nobody tells you about aerospace engineering as a field of study is that a significant
      portion of <em>actual learning</em> happens from watching things fail spectacularly. Textbooks give
      you the theory. RUDs — Rapid Unscheduled Disassemblies — give you the intuition.</p>

      <h2>What I Actually Learned</h2>

      <p>Combustion instability is not a theoretical problem. When you see a rocket engine start oscillating
      and then kind of… disagree with itself at 10,000 RPM, the Rayleigh criterion suddenly becomes
      very real and also very personal.</p>

      <p>I ended up writing three pages of notes that night. My problem set was 40% complete but somehow
      the concepts stuck better than three lectures had managed. Make of that what you will.</p>

      <p>The real lesson: <em>failure is the most information-dense event in engineering.</em>
      Success tells you it worked. Failure tells you approximately seventeen things that don't work,
      one of which is exactly what you needed to know.</p>

      <h2>The Takeaway (I Am Being Serious This Time)</h2>

      <p>I submitted a "field observation report" instead of the problem set.
      My professor did not accept this. However, she did ask what I observed — which turned into
      a 20-minute conversation that was the best office hours I've had all semester.</p>

      <p>Watch more rockets. Take notes. Call it research.</p>
    `,
  },

  {
    id: 'post-statistics',
    title: 'Statistics Is Just Guessing With Extra Steps (I Said What I Said)',
    date: '2025-03-15',
    tags: ['statistics', 'silly', 'maths'],
    excerpt:
      'My professor looked personally offended when I said this. But the more I study it, the more I think I\'m onto something. A p-value is literally a formalized way of saying "probably, maybe, idk."',
    content: `
      <p>Here's the thing about statistics that nobody warns you about before you take it: it is a field
      built entirely on <em>admitting you don't know things</em>, and then being extremely precise
      about how much you don't know.</p>

      <p>A confidence interval is literally: "the answer is somewhere in here. We're pretty sure.
      Like, 95% sure. Which means 1 in 20 times we give you this interval, we're wrong —
      but let's not think about that."</p>

      <h2>The p-value Problem</h2>

      <p>I asked my professor what p = 0.049 actually means and she explained it very well.
      Then I asked what p = 0.051 means and she explained that too. Then I asked what
      the <em>difference</em> between those two results was, and I saw something flicker behind her eyes.</p>

      <p>The difference is: one is "statistically significant" and gets published.
      The other is "fails to reject the null" and goes in a drawer somewhere.
      Both of them are basically the same result. This happens in actual science.
      With actual papers. That actual people cite.</p>

      <p>I'm not saying statistics is bad. I'm saying it's a system built by people who understood
      its limitations, handed to people who didn't, and somewhere in that handoff something got lost.</p>

      <h2>In Conclusion</h2>

      <p>I got an 87 on the midterm — which means I understand statistics well enough to pass tests
      about it, which is very different from understanding statistics.
      I find this both funny and appropriate.</p>

      <p>The field agrees with me, by the way. That's what <em>replication crisis</em> means.</p>
    `,
  },

  {
    id: 'post-website',
    title: 'I Built This Website Instead of Studying. Here\'s the Postmortem.',
    date: '2025-05-01',
    tags: ['webdev', 'meta', 'silly'],
    excerpt:
      'Three weekends. One website. Zero regrets (many regrets). A detailed account of how CSS became my nemesis and then, eventually, a frenemy I have a complicated relationship with.',
    content: `
      <p>Week one: I told myself this would take a weekend. It did not take a weekend.
      What took a weekend was deciding on a color palette, which involved looking at
      approximately 400 developer portfolios, bookmarking 60 of them, and then building
      something completely different anyway.</p>

      <p>I went with <em>cyberpunk-minimal</em> — a genre I invented to describe
      "dark background, one glowing cyan color, and the word Orbitron in at least three font weights."
      I stand by every decision.</p>

      <h2>The CSS Moment</h2>

      <p>There is a specific moment in every frontend project where you realize you don't actually
      understand <code>position: absolute</code>. You think you do. You've used it before.
      But then you try to center something inside something else and suddenly it's 11pm
      and the element is phasing through the floor like a ghost.</p>

      <p>The solution was <code>position: relative</code> on the parent. It always is.
      I did not remember this. I googled it. This is fine and normal and everyone does it.</p>

      <h2>What I'd Do Differently</h2>

      <p>Start with mobile layout. I did not start with mobile layout.
      I finished with mobile layout, which means I "finished" twice and the second time was less fun.</p>

      <p>Other than that: nothing. Building this was the most fun I've had in a while that wasn't
      directly related to watching rockets fail. It's mine. It works.
      You're reading it on it right now — which means something went right.</p>
    `,
  },
];


/* ================================================================
   NAVIGATION SYSTEM
   ================================================================ */

let currentPage = 'home';
let transitioning = false;

function navigate(pageId) {
  if (transitioning || pageId === currentPage) return;

  const currentEl = document.getElementById(`page-${currentPage}`);
  const nextEl    = document.getElementById(`page-${pageId}`);
  if (!currentEl || !nextEl) return;

  transitioning = true;

  // Exit current page
  currentEl.classList.add('exiting');
  currentEl.classList.remove('active');

  // Update nav link highlights
  document.querySelectorAll('.nav-link').forEach((l) => {
    l.classList.toggle('active', l.dataset.page === pageId);
  });

  // After exit animation, show next page
  setTimeout(() => {
    currentEl.classList.remove('exiting');
    nextEl.classList.add('active');
    currentPage = pageId;
    window.scrollTo({ top: 0, behavior: 'instant' });
    transitioning = false;

    // Page-specific init
    if (pageId === 'blog') initBlog();
  }, 420);
}


/* ================================================================
   CURSOR GLOW
   ================================================================ */

const glowEl = document.getElementById('cursor-glow');
let glowRafId = null;
let mouseX = 0, mouseY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  if (!glowRafId) {
    glowRafId = requestAnimationFrame(() => {
      glowEl.style.left = mouseX + 'px';
      glowEl.style.top  = mouseY + 'px';
      glowRafId = null;
    });
  }
});


/* ================================================================
   BLOG SYSTEM
   ================================================================ */

let activeTag   = 'all';
let openPostId  = null;

/* --- Tag helpers --- */

function getAllTags() {
  const set = new Set();
  POSTS.forEach((p) => p.tags.forEach((t) => set.add(t)));
  return ['all', ...Array.from(set).sort()];
}

function formatDate(str) {
  const d = new Date(str + 'T00:00:00');   // force local tz parse
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* --- Init blog (called when page shown) --- */

function initBlog() {
  if (openPostId) return;  // keep current post open
  renderTagFilters();
  renderPostList();
}

/* --- Tag filters --- */

function renderTagFilters() {
  const container = document.getElementById('tag-filters');
  if (!container) return;

  container.innerHTML = getAllTags()
    .map((tag) => {
      const isAll    = tag === 'all';
      const isActive = tag === activeTag;
      return `
        <button
          class="tag-pill${isAll ? ' all-pill' : ''}${isActive ? ' active' : ''}"
          data-tag="${tag}"
          onclick="filterByTag('${tag}')"
        >${isAll ? '# all' : `# ${tag}`}</button>
      `;
    })
    .join('');
}

function filterByTag(tag) {
  activeTag = tag;
  renderTagFilters();
  renderPostList();
}

/* --- Post list --- */

function getFilteredPosts() {
  if (activeTag === 'all') return POSTS;
  return POSTS.filter((p) => p.tags.includes(activeTag));
}

function renderPostList() {
  const list = document.getElementById('post-list');
  if (!list) return;

  const filtered = getFilteredPosts();

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="no-posts">
        // no posts tagged "<em>${activeTag}</em>" yet — write one!
      </div>
    `;
    return;
  }

  list.innerHTML = filtered
    .map(
      (post) => `
      <article class="blog-card" onclick="openPost('${post.id}')">
        <div class="card-top">
          <h3 class="card-title">${escHtml(post.title)}</h3>
          <span class="card-date">${formatDate(post.date)}</span>
        </div>
        <p class="card-excerpt">${escHtml(post.excerpt)}</p>
        <div class="card-tags">
          ${post.tags
            .map(
              (t) =>
                `<span class="card-tag" onclick="event.stopPropagation(); filterByTag('${t}')"># ${t}</span>`
            )
            .join('')}
        </div>
        <div class="read-more">Read more →</div>
      </article>
    `
    )
    .join('');
}

/* --- Open / close full post --- */

function openPost(postId) {
  const post = POSTS.find((p) => p.id === postId);
  if (!post) return;

  openPostId = postId;

  const listView = document.getElementById('blog-list-view');
  const postView = document.getElementById('blog-post-view');
  if (!listView || !postView) return;

  listView.classList.add('hidden');

  postView.innerHTML = `
    <button class="post-back" onclick="closePost()">← Back to blog</button>
    <h1 class="post-title">${escHtml(post.title)}</h1>
    <div class="post-meta">
      <span class="post-meta-date">${formatDate(post.date)}</span>
      <div class="card-tags">
        ${post.tags.map((t) => `<span class="card-tag"># ${t}</span>`).join('')}
      </div>
    </div>
    <div class="post-body">${post.content}</div>
  `;

  postView.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function closePost() {
  openPostId = null;

  const listView = document.getElementById('blog-list-view');
  const postView = document.getElementById('blog-post-view');
  if (!listView || !postView) return;

  postView.classList.remove('active');
  postView.innerHTML = '';
  listView.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* Simple HTML escape — prevents XSS if posts ever come from user input */
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


/* ================================================================
   CONTACT FORM
   ================================================================
   The form currently fakes a send (just shows success state).
   
   To wire it up for real, sign up at https://formspree.io (free),
   get your endpoint, and replace the fetch URL below.
   ================================================================ */

function initContactForm() {
  const form    = document.getElementById('contact-form');
  const success = document.getElementById('form-success');
  const submitBtn  = document.getElementById('submit-btn');
  const submitText = document.getElementById('submit-text');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    submitText.textContent = 'Sending...';
    submitBtn.disabled = true;

    /* ---- Replace this with a real form service ----
       const res = await fetch('https://formspree.io/f/YOUR_ID', {
         method: 'POST',
         body: new FormData(form),
         headers: { Accept: 'application/json' }
       });
       if (!res.ok) { ... handle error ... }
    ------------------------------------------------- */

    // Simulated 1.2s send delay:
    await new Promise((r) => setTimeout(r, 1200));

    form.style.display    = 'none';
    success.style.display = 'block';
  });
}


/* ================================================================
   EVENT LISTENERS — WIRE EVERYTHING TOGETHER
   ================================================================ */

// Nav links
document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    if (link.classList.contains('wip')) return;
    navigate(link.dataset.page);
  });
});

// Logo → home
document.getElementById('nav-logo')?.addEventListener('click', () => navigate('home'));

// data-navigate buttons (Home page CTAs, WIP page buttons)
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-navigate]');
  if (el) navigate(el.dataset.navigate);
});


/* ================================================================
   INIT
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initContactForm();
  // Pre-render blog in the background so tags are ready
  renderTagFilters();
  renderPostList();
});
