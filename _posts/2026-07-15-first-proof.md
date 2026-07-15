---
layout: post
title: "My First Proof"
date: 2026-07-15
tags: [Real Analysis]
excerpt: "I finally wrote my first ε–N proof."
---

I did engineering, so at some point math quietly stopped being a subject and turned into just... a tool. Something you use, not something you sit with.

Lately I've had a bit of free time and decided to go back to Real Analysis. Part of it is that I've always wanted to understand the foundations instead of just borrowing results. Part of it is more selfish, it's a prerequisite for the stochastic processes lectures at college.

Today I wrote my first proof.

An actual rigorous proof.

Showing

$$
\frac{n+1}{n}\longrightarrow1.
$$

Honestly, the proof itself wasn't the hard part. What actually took time was figuring out what \(N\) even needed to be. I sat there staring at the expression longer than I'd like to admit, just trying to pin down that one number. And when I finally saw it, the rest of the proof almost wrote itself.

$$
\varepsilon>0,\qquad
\exists N\in\mathbb N:\ \frac1N<\varepsilon.
$$

$$
n\ge N \Longrightarrow
\left|\frac{n+1}{n}-1\right|
=\frac1n
\le\frac1N
<\varepsilon.
$$

$$
\therefore\quad
\lim_{n\to\infty}\frac{n+1}{n}=1.
$$

It's such a small result. Genuinely nothing impressive to anyone who's taken analysis. But there's something kind of addictive about watching a statement become true simply because the logic leaves it no other possibility. No hand-waving, no "trust me." It just has to be that way.

I think I'm going to enjoy this :)
