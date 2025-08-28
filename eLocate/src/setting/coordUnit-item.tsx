/** @jsx jsx */
import { React, jsx, ThemeVariables, IntlShape, polished} from 'jimu-core'
import { SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
import { TextInput, Radio, Label} from 'jimu-ui'
import { pointunit } from '../config'
import defaultMessages from './translations/default'
import { getStyleForCUI } from './style'
import settingsDefaultMessages from './translations/default'
import { WarningOutlined } from 'jimu-icons/outlined/suggested/warning'
const datumTrans = require('./transform.json')
const spatialRefs = require('./cs.json')

interface Props {
  intl: IntlShape
  theme: ThemeVariables
  optionChange: (prop: string, value: string | number | null) => void
}

interface State {
  itemLabel: string
  itemWKID: number | string
  itemTWKID: number | string
  itemExample: string
  itemXLabel: string
  itemYLabel: string
  itemWgs84option: string
  itemTransformDirection?: string
  wgs84OptVis: boolean
  cName: string
  tfName: string
  validWKID: boolean
  validTFWKID: boolean
}

export default class FilterItem extends React.PureComponent<Props & pointunit, State> {

  constructor (props) {
    super(props)

    this.state = {
      itemLabel: this.props.name || '',
      itemWKID: this.props.wkid || '',
      itemTWKID: this.props.tfwkid || '',
      itemExample: this.props.example || '',
      itemXLabel: this.props.xlabel || '',
      itemYLabel: this.props.ylabel || '',
      itemWgs84option: this.props.wgs84option || '',
      itemTransformDirection: this.props.transformDirection || '',
      wgs84OptVis: this.props.wkid && this.props.wkid === 4326,
      cName: this.getSRLabel(this.props.wkid) || this.i18nMessage('cName', settingsDefaultMessages),
      tfName: this.getTransformationLabel(this.props.tfwkid)|| this.i18nMessage('tfName', settingsDefaultMessages),
      validWKID: (this.props.wkid ? this.isValidWkid(this.props.wkid) : true),
      validTFWKID: (this.props.tfwkid ? this.isValidTfWkid(this.props.tfwkid): true)
    }
  }

  componentDidUpdate (preProps: Props & pointunit, preState: State) {
    if (this.props.name !== preProps.name) {
      this.setState({
        itemLabel: this.props.name || '',
        itemWKID: this.props.wkid || '',
        itemTWKID: this.props.tfwkid || '',
        itemExample: this.props.example || '',
        itemXLabel: this.props.xlabel || '',
        itemYLabel: this.props.ylabel || '',
        itemWgs84option: this.props.wgs84option || '',
        itemTransformDirection: this.props.transformDirection || '',
        wgs84OptVis: this.props.wkid && this.props.wkid === 4326,
        cName: this.getSRLabel(this.props.wkid) || this.i18nMessage('cName', settingsDefaultMessages),
        tfName: this.getTransformationLabel(this.props.tfwkid) || this.i18nMessage('tfName', settingsDefaultMessages),
        validWKID: (this.props.wkid ? this.isValidWkid(this.props.wkid) : true),
        validTFWKID: (this.props.tfwkid ? this.isValidTfWkid(this.props.tfwkid): true)
      })
    }
  }

  getTransformationLabel = function(tfWkid) {
    if (this.isValidTfWkid(tfWkid)) {
      var i = this.indexOfTfWkid(tfWkid);
      return datumTrans.labels[i].toString().replace(/_/g, ' ');
    }
    return "";
  }

  isValidWkid = function(wkid) {
    return this.indexOfWkid(wkid) > -1;
  }

  isValidTfWkid = function(tfWkid) {
    return this.indexOfTfWkid(tfWkid) > -1;
  }

  indexOfTfWkid = function(tfWkid) {
    return datumTrans.tfWkids.indexOf(tfWkid);
  }

  getSRLabel = function(wkid) {
    if (this.isValidWkid(wkid)) {
      var i = this.indexOfWkid(wkid);
      return spatialRefs.labels[i].toString().replace(/_/g, ' ');
    }
  }

  indexOfWkid = function(wkid) {
    return spatialRefs.wkids.indexOf(wkid);
  }

  isGeographicCS = function(wkid) {
    if (this.isValidWkid(wkid)) {
      var pos = this.indexOfWkid(wkid);
      return !spatialRefs.projSR[pos];
    }
    return false;
  }

  isProjectedCS = function(wkid) {
    if (this.isValidWkid(wkid)) {
      var pos = this.indexOfWkid(wkid);
      return spatialRefs.projSR[pos];
    }
    return false;
  }

  nameChange = (event) => {
    const value = event.target.value
    this.setState({ itemLabel: value })
  }

  nameAccept = (value) => {
    value = value?.trim()
    value = value === '' ? this.props.name : value
    if (value !== this.state.itemLabel) {
      this.setState({ itemLabel: value })
    }
    this.props.optionChange('name', value)
  }

  wkidChange = (event) => {
    const value = event.target.value
    let isValid:boolean = true
    let cName:string = this.state.cName
    const newWkid = parseInt(value, 10)
    if(value !== '' && value.toString().length >= 4){
      isValid = this.isValidWkid(newWkid)
      if(isValid){
        cName = this.getSRLabel(newWkid)
      }
    }
    this.setState({
      itemWKID: value,
      validWKID: isValid,
      cName: cName
    })
  }

  wkidAccept = (value) => {
    value = value?.trim()
    value = value === '' ? this.props.wkid : value
    let xLabel:string = this.state.itemXLabel
    let yLabel:string = this.state.itemYLabel
    let wgs84OptVis: boolean =  this.state.wgs84OptVis
    const newWkid = parseInt(value, 10)
    if (value !== this.state.itemWKID) {
      if(newWkid === 4326){
        wgs84OptVis = true
      }
      this.setState({ itemWKID: value, wgs84OptVis: wgs84OptVis })
    }
    this.props.optionChange('wkid', value)
    setTimeout(() => {
      if(this.state.itemXLabel === ""){
        if(this.isGeographicCS(newWkid)){
          xLabel = this.i18nMessage('geox');
        }else{
          xLabel = this.i18nMessage('projx');
        }
        this.xLabelAccept(xLabel);
      }
      if(this.state.itemYLabel === ""){
        if(this.isGeographicCS(newWkid)){
          yLabel = this.i18nMessage('geoy');
        }else{
          yLabel = this.i18nMessage('projy');
        }
        this.yLabelAccept(yLabel);
      }
    }, 20);
  }

  twkidChange = (event) => {
    const value = event.target.value
    let isValid:boolean = true
    let tfName:string = this.state.tfName
    if(value !== '' && value.toString().length >= 4){
      isValid = this.isValidTfWkid(parseInt(value, 10))
      tfName = this.getTransformationLabel(parseInt(value, 10))
    }
    if(value === '' || value === null){
      tfName = this.i18nMessage('tfName', settingsDefaultMessages)
    }
    this.setState({
      itemTWKID: value,
      validTFWKID: isValid,
      tfName: tfName
    })
  }

  twkidAccept = (value) => {
    value = value?.trim()
    if(value === ''){
      value = null
    }
    if (value !== this.state.itemTWKID) {
      this.setState({ itemTWKID: value })
    }
    this.props.optionChange('tfwkid', value)
  }

  exampleChange = (event) => {
    const value = event.target.value
    this.setState({ itemExample: value })
  }

  exampleAccept = (value) => {
    value = value?.trim()
    value = value === '' ? this.props.example : value
    if (value !== this.state.itemExample) {
      this.setState({ itemExample: value })
    }
    this.props.optionChange('example', value)
  }

  xLabelChange = (event) => {
    const value = event.target.value
    this.setState({ itemXLabel: value })
  }

  xLabelAccept = (value) => {
    value = value?.trim()
    if (value !== this.state.itemXLabel) {
      this.setState({ itemXLabel: value })
    }
    this.props.optionChange('xlabel', value)
  }

  yLabelChange = (event) => {
    const value = event.target.value
    this.setState({ itemYLabel: value })
  }

  yLabelAccept = (value) => {
    value = value?.trim()
    if (value !== this.state.itemYLabel) {
      this.setState({ itemYLabel: value })
    }
    this.props.optionChange('ylabel', value)
  }

  onRadioChange = (event) => {
    const checked = event.target.checked
    if (event.target.id !== this.state.itemTransformDirection) {
      this.setState({ itemTransformDirection: event.target.id })
    }
    this.props.optionChange('transformDirection', event.target.id)
  }

  onWGSOptRadioChange = (event) => {
    const checked = event.target.checked
    if (event.target.id !== this.state.itemWgs84option) {
      this.setState({ itemWgs84option: event.target.id })
    }
    this.props.optionChange('wgs84option', event.target.id)
  }

  i18nMessage = (id: string, messages?: any) => {
    messages = messages || defaultMessages
    return this.props.intl.formatMessage({ id: id, defaultMessage: messages[id] })
  }

  render () {
    const{cName, tfName, itemWKID, validTFWKID, validWKID, wgs84OptVis} = this.state
    return (
      <div className='w-100 h-100' css={getStyleForCUI(this.props.theme)}>
        <div className='w-100 h-100 filter-item-panel'>
          <div className='setting-container'>
            <SettingSection>
              <SettingRow flow='wrap' label={this.i18nMessage('wkid', settingsDefaultMessages)}>
                <TextInput
                  size='sm'
                  type='text' className='w-100'
                  value={itemWKID}
                  onChange={this.wkidChange}
                  onAcceptValue={this.wkidAccept}
                  aria-label={this.i18nMessage('wkid', settingsDefaultMessages)}
                />
                {validWKID &&
                  <div className='text-break'>
                    <i style={{ fontSize: polished.rem(10), color: this.props.theme.colors?.palette?.dark[500] }}>{cName}</i>
                  </div>
                }
                {!validWKID &&
                  <div className='d-flex w-100 align-items-center justify-content-between mt-1'>
                    <WarningOutlined size={16} color={this.props.theme.colors?.palette?.danger[500]}/>
                    <div
                      style={{
                        width: 'calc(100% - 20px)',
                        margin: '0 4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: this.props.theme.colors?.palette?.danger[500],
                        fontWeight: 'bold'
                      }}>
                      {this.i18nMessage('invalidWKID', settingsDefaultMessages)}
                    </div>
                  </div>
                }
              </SettingRow>
              {wgs84OptVis && <div>
                <SettingRow flow='wrap' label={this.i18nMessage('inputunits', settingsDefaultMessages)}>
                  <div className='d-flex'><Radio
                    id='dd' style={{ cursor: 'pointer' }}
                    name='dd' onChange={e => this.onWGSOptRadioChange(e)}
                    checked={this.state.itemWgs84option && this.state.itemWgs84option === 'dd'}
                  />
                  <Label style={{ cursor: 'pointer' }} for='dd' className='ml-2'>
                    {this.i18nMessage('dd', settingsDefaultMessages)}
                  </Label>
                  <Radio
                    className='ml-2'
                    id='dms' style={{ cursor: 'pointer' }}
                    name='dms' onChange={e => this.onWGSOptRadioChange(e)}
                    checked={this.state.itemWgs84option && this.state.itemWgs84option === 'dms'}
                  />
                  <Label style={{ cursor: 'pointer' }} for='dms' className='ml-2'>
                    {this.i18nMessage('dms', settingsDefaultMessages)}
                  </Label></div>
                </SettingRow>
                <SettingRow flow='wrap'>
                  <div className='d-flex'><Radio
                    id='dm' style={{ cursor: 'pointer' }}
                    name='dm' onChange={e => this.onWGSOptRadioChange(e)}
                    checked={this.state.itemWgs84option && this.state.itemWgs84option === 'dm'}
                  />
                  <Label style={{ cursor: 'pointer' }} for='dm' className='ml-2'>
                    {this.i18nMessage('dm', settingsDefaultMessages)}
                  </Label>
                  <Radio
                    className='ml-2'
                    id='ddm' style={{ cursor: 'pointer' }}
                    name='ddm' onChange={e => this.onWGSOptRadioChange(e)}
                    checked={this.state.itemWgs84option && this.state.itemWgs84option === 'ddm'}
                  />
                  <Label style={{ cursor: 'pointer' }} for='ddm' className='ml-2'>
                    {this.i18nMessage('ddm', settingsDefaultMessages)}
                  </Label></div>
                </SettingRow>
                </div>
              }
              <SettingRow flow='wrap' label={this.i18nMessage('tfwkid', settingsDefaultMessages)}>
                <TextInput
                  size='sm'
                  type='text' className='w-100'
                  value={this.state.itemTWKID}
                  onChange={this.twkidChange}
                  onAcceptValue={this.twkidAccept}
                  aria-label={this.i18nMessage('tfwkid', settingsDefaultMessages)}
                />
                {validTFWKID &&
                  <div className='text-break'>
                    <i style={{ fontSize: polished.rem(10), color: this.props.theme.colors?.palette?.dark[500] }}>{tfName}</i>
                  </div>
                }
                {!validTFWKID &&
                  <div className='d-flex w-100 align-items-center justify-content-between mt-1'>
                    <WarningOutlined size={16} color={this.props.theme.colors?.palette?.danger[500]}/>
                    <div
                      style={{
                        width: 'calc(100% - 20px)',
                        margin: '0 4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: this.props.theme.colors?.palette?.danger[500],
                        fontWeight: 'bold'
                      }}>
                      {this.i18nMessage('invalidTFWKID', settingsDefaultMessages)}
                    </div>
                  </div>
                }
                {(this.state.itemTWKID !== '' && this.state.itemTWKID !== null) && 
                  <div className='d-flex' style={{margin: '6px auto 0'}}><Radio
                    id='forward' style={{ cursor: 'pointer' }}
                    name='forward' onChange={e => this.onRadioChange(e)}
                    checked={this.state.itemTransformDirection && this.state.itemTransformDirection === 'forward'}
                  />
                  <Label style={{ cursor: 'pointer' }} for='forward' className='ml-2'>
                    {this.i18nMessage('forward', settingsDefaultMessages)}
                  </Label>
                  <Radio
                    className='ml-2'
                    id='reverse' style={{ cursor: 'pointer' }}
                    name='reverse' onChange={e => this.onRadioChange(e)}
                    checked={this.state.itemTransformDirection && this.state.itemTransformDirection === 'reverse'}
                  />
                  <Label style={{ cursor: 'pointer' }} for='reverse' className='ml-2'>
                    {this.i18nMessage('reverse', settingsDefaultMessages)}
                  </Label></div>
                }
              </SettingRow>
              <SettingRow flow='wrap' label={this.i18nMessage('name', settingsDefaultMessages)}>
                <TextInput
                  size='sm'
                  type='text' className='w-100'
                  value={this.state.itemLabel}
                  onChange={this.nameChange}
                  onAcceptValue={this.nameAccept}
                  aria-label={this.i18nMessage('name', settingsDefaultMessages)}
                />
                <div className='text-break'>
                  <i style={{ fontSize: polished.rem(10), color: this.props.theme.colors?.palette?.dark[500] }}>{this.i18nMessage('example', settingsDefaultMessages) + ': ' + this.i18nMessage('nameExample', settingsDefaultMessages)}</i>
                </div>
              </SettingRow>
              <SettingRow flow='wrap' label={this.i18nMessage('example', settingsDefaultMessages)}>
                <TextInput
                  size='sm'
                  type='text' className='w-100'
                  value={this.state.itemExample}
                  onChange={this.exampleChange}
                  onAcceptValue={this.exampleAccept}
                  aria-label={this.i18nMessage('example', settingsDefaultMessages)}
                />
                <div className='text-break'>
                  <i style={{ fontSize: polished.rem(10), color: this.props.theme.colors?.palette?.dark[500] }}>{this.i18nMessage('example', settingsDefaultMessages) + ': ' + this.i18nMessage('unitExample', settingsDefaultMessages)}</i>
                </div>
              </SettingRow>
              <SettingRow flow='wrap' label={this.i18nMessage('xlabel', settingsDefaultMessages)}>
                <TextInput
                  size='sm'
                  type='text' className='w-100'
                  value={this.state.itemXLabel}
                  onChange={this.xLabelChange}
                  onAcceptValue={this.xLabelAccept}
                  aria-label={this.i18nMessage('xlabel', settingsDefaultMessages)}
                />
              </SettingRow>
              <SettingRow flow='wrap' label={this.i18nMessage('ylabel', settingsDefaultMessages)}>
                <TextInput
                  size='sm'
                  type='text' className='w-100'
                  value={this.state.itemYLabel}
                  onChange={this.yLabelChange}
                  onAcceptValue={this.yLabelAccept}
                  aria-label={this.i18nMessage('ylabel', settingsDefaultMessages)}
                />
              </SettingRow>
            </SettingSection>
          </div>
        </div>
      </div>
    )
  }
}
