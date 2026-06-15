---
layout: post
title: "Hypergeometric Sampling and Why Quality Control Gets Expensive"
date: 2026-05-18
tags: [Probability, Quality Control]
excerpt: "I thought inspecting 25 parts out of 500 sounded pretty reasonable. Hypergeometric distributions politely informed me that reality disagrees."
---

I reached the hypergeometric distribution expecting another probability formula I would mechanically memorize and forget three days later.

Instead I accidentally rediscovered why industrial quality assurance becomes absurdly expensive.

The setup looked harmless.

Suppose an aerospace manufacturer produces:

- 500 turbine fasteners
- 12 of them are defective

Now suppose the inspection team randomly samples:

- 25 fasteners
- without replacement

The obvious question becomes:

> "What is the probability that inspection catches at least one defective fastener?"

At first glance, sampling 25 parts sounded decent to me.

25 is not a tiny number.

Surely that catches defects most of the time.

Turns out intuition and combinatorics are not on speaking terms.

---

Let:

$$
X = \text{number of defective fasteners detected}
$$

Then:

$$
X \sim \text{Hypergeometric}(N=500, K=12, n=25)
$$

where:

- $N=500$ is the total population size
- $K=12$ is the number of defective fasteners
- $n=25$ is the sample size

The hypergeometric distribution appears because:

- the population is finite
- sampling is done without replacement

Meaning every draw slightly changes future probabilities.

That is the important distinction from the binomial distribution.

In binomial problems, probabilities stay fixed.

Here they evolve after every sample because the inventory itself changes.

Which is much closer to how real inspection actually works.

---

The probability formula is:

$$
P(X=k)=
\frac{
\binom{K}{k}\binom{N-K}{n-k}
}{
\binom{N}{n}
}
$$

We want:

$$
P(X \ge 1)
$$

because detecting at least one defective fastener counts as a successful inspection.

Direct calculation looked annoying.

The complement was much cleaner:

$$
P(X \ge 1)=1-P(X=0)
$$

So the real question became:

> "What is the probability that inspection completely misses every defective fastener?"

For zero detected defects:

$$
P(X=0)=
\frac{
\binom{12}{0}\binom{488}{25}
}{
\binom{500}{25}
}
$$

which simplifies to:

$$
P(X=0)=
\frac{
\binom{488}{25}
}{
\binom{500}{25}
}
$$

Numerically:

$$
P(X=0)\approx0.536
$$

Therefore:

$$
P(X\ge1)\approx0.464
$$

So the inspection only has roughly:

$$
46.4\%
$$

probability of catching at least one defective fastener.

Which means:

> more than half the time, the inspection misses all defects.

That result felt emotionally wrong.

But mathematically it makes perfect sense.

There are only 12 defective parts hidden among 500 total parts.

Most sampled subsets simply never touch them.

---

Then things got worse.

I asked:

> "Fine. Then how many samples are needed to achieve 95% detection probability?"

So now we solve for:

$$
P(X\ge1)\ge0.95
$$

or equivalently:

$$
P(X=0)\le0.05
$$

Turns out you need to inspect roughly:

$$
110
$$

fasteners.

Not 25.

Not 40.

About 110.

That is when the economics of quality assurance suddenly started making sense.

Rare-defect detection is brutally expensive because high confidence requires surprisingly aggressive sampling.

Especially in aerospace, semiconductor manufacturing, and reliability-critical systems.

---

The interesting realization was that the hypergeometric distribution is not some abstract probability toy.

It is literally the mathematics of finite inventory inspection.

And unlike many textbook examples, the assumptions are actually realistic:

- finite batch
- no replacement
- evolving probabilities

This one genuinely maps onto reality surprisingly well.

Probability theory occasionally does that.
