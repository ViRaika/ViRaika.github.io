---
layout: post
title: "Why Do So Many Numbers Start With 1?"
date: 2026-06-15
tags: [Probability]
excerpt: "A weird probability question about country populations somehow turned into scale invariance and logarithms."
---

I recently ran into what looked like an extremely unserious probability problem.

Something along the lines of:

> *Guess what percentage of countries have populations starting with the digit 1.*

That was it.

No setup.

Just Countries(The total number not mentioned) and first digits of population of those countries.

At first I thought this was a ragebait.

---

The question was simple:

Suppose we look at the population of every country.

How many start with 1?

Examples:

* 1,234,567 → counts
* 89,012,345 → does not count

Before looking at data, make a guess.

My immediate thought was:

> Surely all first digits are equally likely?

There are digits

$$
1,2,3,\dots,9
$$

So probability should just be

$$
\frac{1}{9}
$$

which is around

$$
11.11\%
$$

Seemed perfectly reasonable.

Clean.

Safe & comfortable.

Every digit gets equal representation.

Done.

---

Then I checked.

Welllll,

I wrote a quick pandas script because confidence should always be tested before becoming embarrassing.

Pulled the population data from [Wikipedia's country population list](https://en.wikipedia.org/wiki/List_of_countries_and_dependencies_by_population) because at this point I needed evidence.

And the answer came out to around:

$$
30.96\%
$$

!!?!

Thirty percent???

Almost one-third of countries start with 1?

That is when things got weird.

Because now the question stopped being:

> "What is the answer?"

and became:

> "What kind of cursed mechanism produces this?"

---

The official distribution looked like this:

$$
P(D=d)
=
\log_{10}
\left(
\frac{d+1}{d}
\right)
$$

for

$$
d \in \{1,2,\dots,9\}
$$

Which immediately gives

$$
P(D=1)
=
\log_{10}(2)
\approx 0.301
$$

So somehow mathematics had decided that 1 deserves 30% market share.

---

At first I thought this was just some strange empirical coincidence.

Like maybe country populations are weird.

Maybe geography did something.

Maybe humans boinking in a pattern.

But no.

Apparently this happens in river lengths, stock prices, scientific constants, accounting numbers, and random real-world measurements.

Which made things worse honestly.

Because now the universe itself seemed involved.

---

Then the problem shifted.

Instead of asking directly about first digits, it asked something much stranger.

Suppose every number is written in scientific notation:

$$
X \times 10^N
$$

where

$$
1 \le X < 10
$$

So all the "first digit information" is secretly living inside \(X\).

And then came this PDF:

$$
f(x)=\frac{c}{x}
\qquad
1\le x \le 10
$$

At first this felt incredibly random.

Like why suddenly

$$
\frac{1}{x}
$$

?

Who ordered this distribution.

---

Verifying the constant was easy.

We just normalize:

$$
1
=
\int_1^{10}
\frac{c}{x}
dx
$$

which gives

$$
1=c\ln(10)
$$

so

$$
c=
\frac{1}{\ln(10)}
$$

Fine.

Mechanical.

Nothing interesting yet.

---

But then there was a small sentence hidden in the problem that completely changed how I saw it.

It basically said:

> *The distribution should not depend on the units in which we measure things.*

And suddenly this stopped feeling random.

Because yes.

Of course.

If a country's population starts with 1 in people, it should not suddenly become statistically different because we measured it in thousands of people.

Units changing should not fundamentally alter reality. Makes sense but gives heebie jeebies.

---

So suppose:

$$
Y=aX
$$

for some scaling factor \(a>0\).

We want the distribution to keep looking the same.

Not exactly identical range wise.

But structurally the same.

At first I thought:

> Okay cool, lots of distributions probably do this.

Then I realized....

No.

This condition is absurdly restrictive.

Suppose we try something generic:

$$
f(x)\propto \frac{1}{x^p}
$$

Feels reasonable enough.

Now scale it:

$$
Y=aX
$$

Using change of variables:

$$
f_Y(y)
=
f_X(y/a)\frac{1}{a}
$$

Substituting:

$$
f_Y(y)
\propto
\frac{1}{(y/a)^p}
\cdot
\frac{1}{a}
$$

which becomes

$$
a^{p-1}
\frac{1}{y^p}
$$

And this is where the trap closes.

For the shape to survive arbitrary scaling, that annoying factor

$$
a^{p-1}
$$

must disappear.

For *every* value of \(a\).

Which basically forces:

$$
p=1
$$

So suddenly

$$
f(x)\propto \frac{1}{x}
$$

was not random at all.

It was almost inevitable.

That was the moment the whole thing clicked.

---

And once you accept

$$
f(x)
=
\frac{1}{x\ln(10)}
$$

everything falls out beautifully.

The first digit is \(d\) whenever

$$
d\le X<d+1
$$

So:

$$
P(D=d)
=
\int_d^{d+1}
\frac{1}{x\ln(10)}
dx
$$

which becomes

$$
\log_{10}
\left(
\frac{d+1}{d}
\right)
$$

And there it was.

The weird country-population mystery.

Explained.

---

The funny thing is, I started this problem thinking:

> "Obviously \(\frac{1}{9}\)."

Completely confident.

Well its not the first time intuition "flipped" me :)
