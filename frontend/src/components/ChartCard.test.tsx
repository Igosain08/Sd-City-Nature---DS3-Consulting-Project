import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChartCard } from './ChartCard';

describe('ChartCard Component', () => {
  it('should render title and children when not loading', () => {
    render(
      <ChartCard title="Test Chart">
        <div>Chart Content</div>
      </ChartCard>
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.getByText('Chart Content')).toBeInTheDocument();
  });

  it('should render subtitle when provided', () => {
    render(
      <ChartCard title="Test Chart" subtitle="Test Subtitle">
        <div>Chart Content</div>
      </ChartCard>
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('should show loading spinner when loading is true', () => {
    const { container } = render(
      <ChartCard title="Test Chart" loading={true}>
        <div>Chart Content</div>
      </ChartCard>
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.queryByText('Chart Content')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should show error message when error is provided', () => {
    render(
      <ChartCard title="Test Chart" error="Something went wrong">
        <div>Chart Content</div>
      </ChartCard>
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.getByText('Error loading data')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText('Chart Content')).not.toBeInTheDocument();
  });

  it('should not render children when loading', () => {
    render(
      <ChartCard title="Test Chart" loading={true}>
        <div>Chart Content</div>
      </ChartCard>
    );

    expect(screen.queryByText('Chart Content')).not.toBeInTheDocument();
  });

  it('should not render children when error exists', () => {
    render(
      <ChartCard title="Test Chart" error="Error message">
        <div>Chart Content</div>
      </ChartCard>
    );

    expect(screen.queryByText('Chart Content')).not.toBeInTheDocument();
  });

  it('should have correct styling classes', () => {
    const { container } = render(
      <ChartCard title="Test Chart">
        <div>Chart Content</div>
      </ChartCard>
    );

    const card = container.firstChild;
    expect(card).toHaveClass('bg-white');
    expect(card).toHaveClass('rounded-lg');
    expect(card).toHaveClass('shadow-md');
  });

  it('should prioritize error over loading state', () => {
    const { container } = render(
      <ChartCard title="Test Chart" loading={true} error="Error occurred">
        <div>Chart Content</div>
      </ChartCard>
    );

    expect(screen.getByText('Error loading data')).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('Chart Content')).not.toBeInTheDocument();
  });
});
