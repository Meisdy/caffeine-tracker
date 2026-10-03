// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { WhatIfCard } from './WhatIfCard';
import { makeProfile } from '../../domain/testFixtures';

const noon = new Date('2026-01-15T12:00:00').getTime();
const bedtime = new Date('2026-01-15T23:00:00').getTime();

function renderCard() {
  return render(<WhatIfCard doses={[]} profile={makeProfile()} favorites={[]} nowMs={noon} bedtimeAt={bedtime} />);
}

afterEach(cleanup);

describe('WhatIfCard', () => {
  it('rates a default dose an hour from now as fine for sleep', () => {
    renderCard();

    expect(screen.getByText(/Fine for sleep/)).toBeTruthy();
  });

  it('warns and offers a latest safe time for a dose just before bedtime', () => {
    renderCard();

    fireEvent.change(screen.getByLabelText('At'), { target: { value: '22:30' } });
    fireEvent.change(screen.getByLabelText(/Dose/), { target: { value: '100' } });

    expect(screen.getByText(/Would disturb sleep/)).toBeTruthy();
    expect(screen.getByText(/Latest safe time for this dose/)).toBeTruthy();
  });

  it('asks for a valid time when the chosen time is in the past', () => {
    renderCard();

    fireEvent.change(screen.getByLabelText('At'), { target: { value: '09:00' } });

    expect(screen.getByText(/Pick a time between now and bedtime/)).toBeTruthy();
  });
});
