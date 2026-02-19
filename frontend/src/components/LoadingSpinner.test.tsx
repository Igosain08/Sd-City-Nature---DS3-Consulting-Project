import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner Component', () => {
  it('should render without crashing', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container).toBeTruthy();
  });

  it('should have spinner with correct classes', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');
    
    expect(spinner).toBeTruthy();
    expect(spinner).toHaveClass('rounded-full');
    expect(spinner).toHaveClass('h-12');
    expect(spinner).toHaveClass('w-12');
  });

  it('should be centered in a flex container', () => {
    const { container } = render(<LoadingSpinner />);
    const wrapper = container.firstChild;
    
    expect(wrapper).toHaveClass('flex');
    expect(wrapper).toHaveClass('items-center');
    expect(wrapper).toHaveClass('justify-center');
  });
});
