---
layout: post
title: "Blitzstein experience (Lec 3) — Gambler's Ruin"
date: 2026-05-16
tags: [Probability, Linear Algebra]
excerpt: "I started with a simple gambler's ruin problem expecting probability tricks. Somehow I ended up rediscovering eigenvectors, matrix diagonalization, and why exponentials naturally appear in difference equations."
---

I started watching Blitzstein's lecture on Gambler's Ruin expecting a standard probability exercise.

Two gamblers.
One dollar bets.
One of them eventually gets destroyed.

Classic.

The setup is simple:

- Gambler A starts with $i$ dollars.
- Gambler B starts with $n-i$ dollars.
- Every round, exactly one dollar changes hands.
- A wins a round with probability $p$.
- B wins a round with probability $q = 1-p$.
- The game stops when one gambler hits bankruptcy.

The quantity of interest is:

$$
P(\text{A eventually wins} \mid \text{A starts with } i \text{ dollars})
$$

Let:

$$
p_i = P(\text{A eventually wins} \mid \text{starts at } i)
$$

At first I tried forcing Bayes' theorem into it.

That went terribly.

I started thinking in terms of paths and labels:

> "To reach the winning state from label $i$, A needs favorable steps... maybe I can count paths..."

Then I accidentally started assuming the game ends in exactly $n$ steps.

It does not.

The walk can wander forever before absorption.

So counting paths directly quickly becomes cursed.

Then I realized the process only depends on the *next move*.

From state $i$:

- with probability $p$, we move to $i+1$
- with probability $q$, we move to $i-1$

And after that move, the problem is literally the same problem again.

So by the Law of Total Probability:

$$
p_i = p\,p_{i+1} + q\,p_{i-1}
$$

with boundary conditions:

$$
p_0 = 0
$$

because if A has no money, A is already ruined.

and

$$
p_n = 1
$$

because if A has all the money, A has already won.

At this point I tried brute-forcing the recurrence.

I started expanding terms manually:

$$
p_1 = p p_2
$$

$$
p_2 = p p_3 + q p_1
$$

and then expressing everything in terms of $p_1$.

For a few terms, a suspiciously clean pattern emerged.

Naturally, I became overconfident.

I guessed a formula.

The formula worked beautifully.

For exactly three terms.

Then the recurrence punched me in the face with an extra:

$$
p^2 q^2
$$

term that absolutely refused to disappear.

This is apparently how mathematics reminds you to stay humble.

---

Then something strange happened.

While staring at the recurrence:

$$
p_i = p p_{i+1} + q p_{i-1}
$$

I suddenly remembered Gilbert Strang talking about matrix powers and diagonalization.

The recurrence felt familiar.

Not probability familiar.

Linear algebra familiar.

So I rewrote the equation:

$$
p_{i+1} = \frac{1}{p}p_i - \frac{q}{p}p_{i-1}
$$

and packaged consecutive terms into a vector:

$$
u_i =
\begin{pmatrix}
 p_i \\
 p_{i-1}
\end{pmatrix}
$$

Then:

$$
u_{i+1} =
\begin{pmatrix}
1/p & -q/p \\
1 & 0
\end{pmatrix}

u_i
$$

Define:

$$
A =
\begin{pmatrix}
1/p & -q/p \\
1 & 0
\end{pmatrix}
$$

Now the recurrence becomes:

$$
u_{i+1} = A \nu_i
$$

which means:

$$
u_i = A^{i-1} \nu_1
$$

And suddenly the entire problem transformed into:

> "Find powers of a matrix."

Which is exactly what diagonalization was made for.

So now the probability problem became:

$$
A = S \Lambda S^{-1}
$$

and therefore:

$$
A^k = S \Lambda^k S^{-1}
$$

At this point the recurrence stopped looking mysterious.

The famous exponential guess:

$$
p_i = r^i
$$

also finally made sense.

I used to think people just magically guessed exponentials because mathematicians collectively agreed to be cryptic.

But no.

Exponentials appear because shifting them only multiplies them by constants:

$$
r^{i+1} = r r^i
$$

That means they are preserved under the shift operation.

Which is exactly what eigenvectors do under matrix multiplication:

$$
Av = \lambda v
$$

Same philosophy.

Different costume.

The characteristic equation becomes:

$$
p\lambda^2 - \lambda + q = 0
$$

with roots:

$$
\lambda_1 = 1
$$

and

$$
\lambda_2 = \frac{q}{p}
$$

Eventually the full solution becomes:

$$
p_i = \frac{1-(q/p)^i}{1-(q/p)^n}
$$

for:

$$
p \neq q
$$

and in the fair case:

$$
p=q=\frac12
$$

it collapses beautifully into:

$$
p_i = \frac{i}{n}
$$

which honestly feels so clean that it almost looks fake.

---

The interesting part wasn't even the final answer.

It was realizing that:

- probability recursion,
- difference equations,
- matrix iteration,
- eigenvectors,
- exponential solutions,
- and diagonalization

are all secretly describing the same structure.

I started with two gamblers exchanging one dollar.

I ended up rediscovering why exponentials are eigenfunctions of shifting.

Blitzstein lectures are dangerous like that.
