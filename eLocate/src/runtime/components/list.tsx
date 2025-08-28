/** @jsx jsx */
import {jsx, React} from 'jimu-core';
import { Icon } from 'jimu-ui';
import { listItem, locateType } from '../../config';

const xIcon = require('jimu-ui/lib/icons/close-12.svg');
const pinIcon = require('../assets/i_pin1.gif');
const mailboxIcon = require('../assets/i_mailbox.gif');
const houseIcon = require('../assets/i_house.gif');

interface ListProps  {
  items: listItem[],
  removeResultMsg: string;
  onRecordClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onRecordRemoveClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onRecordMouseOver: (e: React.MouseEvent<HTMLDivElement>) => void;
  onRecordMouseOut: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default class List extends React.Component<ListProps>{  

  constructor(props) {
    super(props);
  }

  getAttributeElements = (item: listItem) : JSX.Element[] => {
    const attEleArray = [];
    if(item.content !== ""){
        const itemId:string = item.id;
        const attArr = item.content.split('<br>');
        let attValArr:string[], tHasColor:boolean, btIndex:number, etIndex:number, 
        bvIndex:number, evIndex:number, tColor:string, 
        vHasColor:boolean, vColor:string;
        attArr.map((attr:string, index) =>{
            attValArr = attr.split(': ');

            //Work with Attribute Title
            tHasColor = (attValArr[0].toLowerCase().indexOf("<font color='") > -1) ? true : false;
            if(tHasColor){
              btIndex = attValArr[0].toLowerCase().indexOf("<font color='") + 13;
              etIndex = attValArr[0].toLowerCase().indexOf("'>", btIndex);
              tColor = attValArr[0].substr(btIndex, etIndex - btIndex);
            }

            //Work with Attribute Value
            vHasColor = (attValArr[1].toLowerCase().indexOf("<font color='") > -1) ? true : false;
            if(tHasColor){
              bvIndex = attValArr[1].toLowerCase().indexOf("<font color='") + 13;
              evIndex = attValArr[1].toLowerCase().indexOf("'>", bvIndex);
              vColor = attValArr[1].substr(bvIndex, evIndex - bvIndex);
            }

            let attrValueCont;
            if (attValArr[1] === 'null') {
              attrValueCont = ": ";
            } else {
              attrValueCont = attValArr[1].replace(/<[\/]{0,1}(em|EM|strong|STRONG|font|FONT|u|U)[^><]*>/g, "");
            }

            const attrib:JSX.Element = <p className='rlabel' id={itemId}
            title={attValArr[0].replace(/<[\/]{0,1}(em|EM|strong|STRONG|font|FONT|u|U)[^><]*>/g, "")  + ": " + attrValueCont}>
              <font id={itemId}
                style={{
                  fontStyle: attValArr[0].toLowerCase().indexOf('<em>') > -1 ? 'italic' : 'normal',
                  fontWeight: attValArr[0].toLowerCase().indexOf('<strong>') > -1 ? 'bold' : 'normal',
                  textDecoration: attValArr[0].toLowerCase().indexOf('<u>') > -1 ? 'underline' : 'initial',
                  color: tHasColor ? tColor : 'initial'
                }}>{attValArr[0].replace(/<[\/]{0,1}(em|EM|strong|STRONG|font|FONT|u|U)[^><]*>/g, "")  + ": "}</font>
              <font style={{
                fontStyle: attValArr[1].toLowerCase().indexOf('<em>') > -1 ? 'italic' : 'normal',
                fontWeight: attValArr[1].toLowerCase().indexOf('<strong>') > -1 ? 'bold' : 'normal',
                textDecoration: attValArr[1].toLowerCase().indexOf('<u>') > -1 ? 'underline' : 'initial',
                color: vHasColor ? vColor : 'initial'
              }}>{attrValueCont}</font>
            </p>;
            attEleArray.push(attrib);
        });
    }else{
      const nrattrib:JSX.Element = <p className='rlabel'> </p>;
      attEleArray.push(nrattrib);
    }
    return attEleArray;
  }

  render() {
    return (
      <div className="search-list-container">
        {this.props.items.map((item: listItem, i) => {
          const itemId:string = item.id;  
          let iconType;
          switch(item.type){
            case locateType.address:
              iconType = mailboxIcon;
              break;
            case locateType.coordinate:
              iconType = pinIcon;
              break;
            case locateType.reverse:
              iconType = houseIcon;
              break;
          }       
          return (
            <div className={`search-list-item${item.selected?' selected':''}${(i % 2 === 0)?' alt':''}`} id={itemId}
              onMouseOver={this.props.onRecordMouseOver} onMouseOut={this.props.onRecordMouseOut}
              onClick={this.props.onRecordClick}>
              <div className='iconDiv'><Icon icon={iconType} width='26px' height='26px' /></div>
              <div className='removediv' id={itemId}>
                <div className='removedivImg' id={itemId} title={this.props.removeResultMsg}
                onClick={this.props.onRecordRemoveClick}><Icon icon={xIcon} /></div>
              </div>
              <p id={itemId} className={'_title'} title={item.title}>{item.title}</p>
                {this.getAttributeElements(item)}
            </div>
          )
        })}
      </div>
    )
  }
}