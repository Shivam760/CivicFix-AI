import React from 'react';

/**
 * ErrorBoundary
 * Catches an error thrown while drawing its children and shows `fallback`
 * instead. Without one, React removes the whole page and the screen goes blank.
 *
 * React only supports this as a class component (there is no hook for it).
 * resetKey: when it changes (e.g. the URL), the boundary tries again.
 * fallback: a React node, or a function ({ error, reset }) => node.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, resetKey: props.resetKey };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    // A new page (resetKey) gets a fresh start.
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  componentDidCatch(error, info) {
    // For the developer's console; the user sees the fallback.
    console.error('Caught by ErrorBoundary:', error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { fallback } = this.props;
    return typeof fallback === 'function' ? fallback({ error, reset: this.reset }) : fallback ?? null;
  }
}
