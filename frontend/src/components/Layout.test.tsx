import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Layout } from './Layout';
import { BrowserRouter } from 'react-router-dom';

// Mock the Outlet component
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div>Outlet Content</div>,
  };
});

describe('Layout Component', () => {
  const renderLayout = () => {
    return render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );
  };

  it('should render without crashing', () => {
    const { container } = renderLayout();
    expect(container).toBeTruthy();
  });

  it('should render Navbar component', () => {
    renderLayout();
    expect(screen.getByText('SD City Nature Challenge Optimizer')).toBeInTheDocument();
    expect(screen.getByText('UC San Diego Natural Reserve System')).toBeInTheDocument();
  });

  it('should render Sidebar navigation items', () => {
    renderLayout();
    expect(screen.getByText('Exploratory Analysis')).toBeInTheDocument();
    expect(screen.getByText('Hotspot & Gap Analysis')).toBeInTheDocument();
    expect(screen.getByText('City Comparison')).toBeInTheDocument();
    expect(screen.getByText('Strategy Recommendations')).toBeInTheDocument();
  });

  it('should render Outlet content', () => {
    renderLayout();
    expect(screen.getByText('Outlet Content')).toBeInTheDocument();
  });

  it('should have correct layout structure', () => {
    const { container } = renderLayout();
    const mainElement = container.querySelector('main');
    
    expect(mainElement).toBeTruthy();
    expect(mainElement).toHaveClass('flex-1');
    expect(mainElement).toHaveClass('p-6');
  });

  it('should have flex layout for sidebar and main content', () => {
    const { container } = renderLayout();
    const flexContainer = container.querySelector('.flex');
    
    expect(flexContainer).toBeTruthy();
  });
});
