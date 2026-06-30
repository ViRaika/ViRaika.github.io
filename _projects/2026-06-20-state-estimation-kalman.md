---
layout: project
title: "1D State Estimation from First Principles"
date: 2026-06-20
tags: [Estimation, Linear Algebra, Probability]
excerpt: "Deriving the optimal fusion of dead reckoning and a noisy measurement from variance minimization alone — no Kalman filtering or control theory assumed, and it turns out to have the exact shape of a 1D Kalman gain."
github: https://github.com/ViRaika/state-estimation-kalman
status: complete
# cover: /assets/images/projects/kalman/cover.png   # uncomment once you add a cover image (see notes at bottom)
---

Dead reckoning vs. optimal estimation, derived without assuming any prior knowledge of control theory, signal processing, or Bayesian filtering , built entirely from **Strang Linear Algebra** and **Stat110 Probability**.


<ins>**Two framings of the same project**</ins>

**As a navigation / GNC problem:** dead reckoning accumulates drift from a single bad velocity reading because there's no external correction. This project derives, from scratch, the optimal way to fuse a propagated estimate with a fresh noisy measurement — structurally identical to a one-dimensional Kalman gain, arrived at independently.

**As a statistical modeling problem:** given two independent, unbiased, differently-uncertain estimators of the same unknown, what's the minimum-variance linear combination? This is a pure variance-minimization argument over noisy observations, no different in spirit from combining noisy estimates in any applied statistics setting.


<ins>**Result**</ins>

$$
\alpha^\star = \frac{\mathrm{Var}(z_n)}{\mathrm{Var}(z_n) + \mathrm{Var}(x_{DR,n})}
$$

The weight on each estimate is proportional to the variance of the *other* one. At $n=1$ both sources are equally uncertain, so $\alpha^\star = 0.5$. As dead-reckoning drift grows, $\alpha^\star \to 0$ and the estimator naturally abandons it in favor of fresh measurements.


<ins>**Prerequisites used (and deliberately not used)**</ins>

**Used:** linear transformations and eigenvalues (Strang); linearity of expectation, $\mathrm{Var}(aX)=a^2\mathrm{Var}(X)$, independence of sums of random variables (Stat110); elementary kinematics.

**Not assumed:** control theory, Kalman filtering, Bayesian updating, machine learning, optimization theory. The Kalman-gain-shaped result falls out of variance minimization alone.


<ins>**Process notes**</ins>

The full derivation documents the actual path taken, including an initial incorrect matrix guess, an early conflation of propagated vs. fresh measurement noise, and a sign error in the optimal-weight derivation caught via an edge-case sanity check. Kept intentionally — the corrections are as much the point as the final result.

[Full derivation and figures on GitHub →](https://github.com/ViRaika/state-estimation-kalman)
