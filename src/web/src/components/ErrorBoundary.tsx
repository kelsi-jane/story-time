import React from 'react';
import { ErrorPage } from '../pages/ErrorPage';

interface State { crashed: boolean }

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  render() {
    return this.state.crashed ? <ErrorPage status={500} /> : this.props.children;
  }
}
