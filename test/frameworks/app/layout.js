import '@materialwebunofficial/md3e-web/tokens';
import {createElement} from 'react';
export default function Layout({children}) {
  return createElement('html',{lang:'en'},createElement('body',null,children));
}
