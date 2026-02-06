import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Navbar } from './Navbar';

describe('Navbar Component', () => {
  it('should render without crashing', () => {
    const { container } = render(<Navbar />);
    expect(container).toBeTruthy();
  });

  it('should display the title', () => {
    render(<Navbar />);
    expect(screen.getByText('SD City Nature Challenge Optimizer')).toBeInTheDocument();
  });

  it('should display the organization name', () => {
    render(<Navbar />);
    expect(screen.getByText('UC San Diego Natural Reserve System')).toBeInTheDocument();
  });

  it('should display the year', () => {
    render(<Navbar />);
    expect(screen.getByText('2026 Analysis')).toBeInTheDocument();
  });

  it('should have UC logo badge', () => {
    render(<Navbar />);
    expect(screen.getByText('UC')).toBeInTheDocument();
  });

  it('should have correct styling classes', () => {
    const { container } = render(<Navbar />);
    const nav = container.querySelector('nav');
    
    expect(nav).toHaveClass('bg-white');
    expect(nav).toHaveClass('shadow-md');
    expect(nav).toHaveClass('border-b');
  });
});
