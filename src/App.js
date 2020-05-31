import React from "react";
import Test from './New';
import Show from './Show';
import DocShow from './DocShow';

import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";


function App(){
  return(
    <Router>
      <Switch>
          <Route path="/new">
            <Test />
          </Route>
          <Route exact path="/">
            <Show />
          </Route>
          <Route path="/:address">
            <DocShow />
          </Route>
        </Switch>
    </Router>
  );
}

export default App;