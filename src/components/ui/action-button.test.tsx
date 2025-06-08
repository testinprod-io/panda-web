import { render, screen } from '@testing-library/react';
import { ActionButton } from './action-button';
import { describe, it, expect } from 'vitest';

describe('ActionButton', () => {
  it('renders the button with text and icon', () => {
    const buttonText = 'Click me';
    const Icon = () => <svg data-testid="icon" />;

    render(<ActionButton text={buttonText} icon={<Icon />} />);

    expect(screen.getByText(buttonText)).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});