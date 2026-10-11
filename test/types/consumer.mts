import {MdButton,MdShape,MdTextField,createComponentSheet,adoptSheet,generateM3Scheme} from '@materialwebunofficial/md3e-web';
import {MdButton as SelectiveButton} from '@materialwebunofficial/md3e-web/components/md-button.js';
import {MdSelect,MdOption} from '@materialwebunofficial/md3e-web/components/md-select';
import {generateM3Scheme as serverScheme} from '@materialwebunofficial/md3e-web/theme';
// @ts-expect-error The internal declaration base has no runtime export.
import {MdBaseComponent} from '@materialwebunofficial/md3e-web';
const button:MdButton=new SelectiveButton();button.selected=true;
const field=new MdTextField();field.pattern='[0-9]+';field.min='10';field.minLength=3;
const option=new MdOption();option.defaultSelected=true;
const select=new MdSelect();select.value=option.value;
const shape=new MdShape();shape.name='sunny';
const createdShape:MdShape=document.createElement('md-shape');createdShape.mask=true;
adoptSheet(shape.shadowRoot!,createComponentSheet(':host{display:block}'));
generateM3Scheme('#6750A4',false);serverScheme('#6750A4',true);
