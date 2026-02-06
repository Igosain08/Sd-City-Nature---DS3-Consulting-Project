import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { BrowserRouter } from 'react-router-dom';

describe('Sidebar Component', () => {
  const renderSidebar = () => {
    return render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );
  };

  it('should render without crashing', () => {
    const { container } = renderSidebar();
    expect(container).toBeTruthy();
  });

  it('should display all navigation items', () => {
    renderSidebar();
    
    expect(screen.getByText('Exploratory Analysis')).toBeInTheDocument();
    expect(screen.getByText('Hotspot & Gap Analysis')).toBeInTheDocument();
    expect(screen.getByText('City Comparison')).toBeInTheDocument();
    expect(screen.getByText('Strategy Recommendations')).toBeInTheDocument();
  });

  it('should have correct navigation links', () => {
    renderSidebar();
    
    const exploratoryLink = screen.getByText('Exploratory Analysis').closest('a');
    const hotspotsLink = screen.getByText('Hotspot & Gap Analysis').closest('a');
    const comparisonLink = screen.getByText('City Comparison').closest('a');
    const strategyLink = screen.getByText('Strategy Recommendations').closest('a');
    
    expect(exploratoryLink).toHaveAttribute('href', '/');
    expect(hotspotsLink).toHaveAttribute('href', '/hotspots');
    expect(comparisonLink).toHaveAttribute('href', '/comparison');
    expect(strategyLink).toHaveAttribute('href', '/strategy');
  });

  it('should have correct sidebar styling', () => {
    const { container } = renderSidebar();
    const aside = container.querySelector('aside');
    
    expect(aside).toHaveClass('w-64');
    expect(aside).toHaveClass('bg-gray-50');
    expect(aside).toHaveClass('border-r');
  });

  it('should render all four navigation links', () => {
    renderSidebar();
    
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
  });
});
