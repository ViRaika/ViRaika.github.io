---
layout: post
title: "When Will Luck Finally Arrive?"
date: 2026-06-03
tags: [Probability]
excerpt: "A friend said they had never experienced a lucky day. Naturally, I tried to model it."
---

A friend of mine recently said something deeply statistical without realizing it:

> "Mera toh kabhi lucky day aya hi nahi. Kab ayega luck? T_T"

Well naturally the question is,

> "If lucky days happen randomly, how long should someone expect to wait for one?"

Which sounded suspiciously like a waiting-time problem.

So naturally, I tried to model it.

---

Let us define a random variable:

$$
X_i = \begin{cases} 1, & \text{if day } i \text{ is lucky} \\ 0, & \text{otherwise} \end{cases}
$$

Assume:

- every day is independent
- a lucky day occurs with probability $p$
- yesterday's bad luck does not influence tomorrow

Already unrealistic :p

But useful.

Now let:

$$
T = \text{time until first lucky day}
$$

This becomes a geometric distribution problem:

$$
P(T = k) = (1-p)^{k-1} \cdot p
$$

Meaning:

- no luck for $k-1$ days
- luck finally appears on day $k$

The nice thing about the geometric distribution is that the expected waiting time has a beautifully clean form:

$$
E[T] = \frac{1}{p}
$$

---

Now comes the dangerous part.

Choosing $p$.

Because probability models become emotionally unstable the moment you invent numbers.

Suppose we define a genuinely lucky day as:

> "A noticeably good day where something unexpectedly works out."

Not life-changing.

Just enough to make someone say: *damn, today was actually good.*

Being mildly optimistic:

$$
p = 0.02
$$

Roughly a 2% chance per day.

Then:

$$
E[T] = \frac{1}{0.02} = 50
$$

So according to highly questionable probabilistic reasoning, the expected wait is around 50 days.

---

But there is an important catch.

This does not mean luck arrives exactly on day 50.

It means: if this process repeated many times, the average waiting time across all those runs would be around 50 days.

Probability refuses to make promises.

It only gives expectations.

In fact, even after 50 days of waiting:

$$
P(T > 50) = (0.98)^{50} \approx 0.364
$$

Meaning there is still a 36% chance that luck still has not shown up.

Which somehow feels emotionally accurate.

---

The genuinely interesting part is the memoryless property of the geometric distribution:

$$
P(T > s + t \mid T > s) = P(T > t)
$$

Meaning: if today was unlucky, tomorrow does not know that.

The process resets.

Probability has no memory of previous suffering.

So if someone says:

> "I have never had a lucky day."

The model simply replies:

> "Understood. Your odds tomorrow are identical to day one."

Cold.

But technically correct.

---

I bet this is not reassuring.

But here is what I think is actually worth noticing.

The memoryless property cuts both ways.

It means no debt accumulates.

But it also means no probability ever gets subtracted from you.

Every morning is a fresh geometric trial :)

