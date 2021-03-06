import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';
import SignInForm from './signinForm';
import { withOktaAuth } from '@okta/okta-react';

class SignIn extends Component {
  render() {
    if (this.props.authState.isPending) {
      return <div>Loading...</div>;
    }

    return this.props.authState.isAuthenticated ?
      <Redirect to={{ pathname: '/dashboard' }} /> : 
      <SignInForm issuer={this.props.issuer} />;

  }
};

export default withOktaAuth(SignIn);
