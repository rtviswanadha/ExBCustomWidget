/**
  Licensing

  Copyright 2020 Esri

  Licensed under the Apache License, Version 2.0 (the "License"); You
  may not use this file except in compliance with the License. You may
  obtain a copy of the License at
  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
  implied. See the License for the specific language governing
  permissions and limitations under the License.

  A copy of the license is available in the repository's
  LICENSE file.
*/
/** @jsx jsx */
import {React, jsx, urlUtils, polished, loadArcGISJSAPIModules, defaultMessages as jimuCoreMessages, Immutable} from 'jimu-core'
import {AllWidgetSettingProps} from 'jimu-for-builder'
import { TextArea, TextInput, defaultMessages as jimuiDefaultMessage, Select, Checkbox, Button, Switch, NumericInput} from 'jimu-ui'
import {IMConfig, locateType} from '../config';
import defaultMessages from '../runtime/translations/default'
import settingsDefaultMessages from './translations/default'
import { WarningOutlined } from 'jimu-icons/outlined/suggested/warning'
import {MapWidgetSelector, SettingSection, SettingRow, SidePopper} from 'jimu-ui/advanced/setting-components'
import { getStyleForWidget } from './style'
import CoordUnitItem from './coordUnit-item'
import { List, TreeItemActionType } from 'jimu-ui/basic/list-tree'
import { CloseOutlined } from 'jimu-icons/outlined/editor/close'
import { PinEsriOutlined } from 'jimu-icons/outlined/gis/pin-esri'
import { PlusOutlined } from 'jimu-icons/outlined/editor/plus'
const DefaultGeocodeURL: string = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer';
const PinEsriOutlined2 = require('jimu-icons/svg/outlined/gis/pin-esri.svg')

export interface widgetSettingsState{
  geocodeURL: string
  urlCheckResult: UrlCheckResult
  isHadEnterGeocodeUrl: boolean
  countryCode: string
  initialView: locateType
  autoClose: number
  zoomScale: number
  forceScale: boolean
  keepInspectorActive: boolean
  limit2ViewExtent: boolean
  popupCoordsSR: number
  popupCoordsSRprecision: number
  showCoordUnitItemPanel: boolean
  popperFocusNode: HTMLElement
  addressDisabled: boolean
  coordinateDisabled: boolean
  reverseDisabled: boolean
  resultDisabled: boolean
  noVisibleTabs: boolean
}

enum UrlCheckResultType {
  Pass = 'Pass',
  NotHttps = 'Not_Https',
  InvalidURL = 'Invalid_URL'
}

interface UrlCheckResult {
  urlCheckResultType: UrlCheckResultType
  singleLineFieldName?: string
}

export default class Setting extends React.PureComponent<AllWidgetSettingProps<IMConfig>, widgetSettingsState>{
  sidePopperTrigger = React.createRef<HTMLDivElement>()
  index: number
  constructor (props) {
    super(props)
    const {config} = this.props;
    this.state = {
      geocodeURL: config?.locator?.url,
      urlCheckResult: {urlCheckResultType: UrlCheckResultType.Pass},
      isHadEnterGeocodeUrl: false,
      countryCode: config?.locator?.countryCode,
      initialView: config?.initialView || locateType.address,
      autoClose: (config?.autoClosePopup /1000),
      zoomScale: config?.zoomscale,
      forceScale: config?.forcescale || false,
      keepInspectorActive: config?.keepinspectoractive || false,
      limit2ViewExtent: config?.limitsearchtoviewextentbydefault || false,
      popupCoordsSR: config?.coordinateWKID,
      popupCoordsSRprecision: (config?.coordinatePrecision !== undefined) ? config?.coordinatePrecision : 2,
      showCoordUnitItemPanel: false,
      popperFocusNode: null,
      addressDisabled: config?.disabledtabs?.indexOf('address') > -1 || false,
      coordinateDisabled: config?.disabledtabs?.indexOf('coordinate') > -1 || false,
      reverseDisabled: config?.disabledtabs?.indexOf('reverse') > -1 || false,
      resultDisabled: config?.disabledtabs?.indexOf('result') > -1 || false,
      noVisibleTabs: false
    }
    if(!config.coordinatePrecision){
      this.onPropertyChange('coordinatePrecision', 2)
    }
    this.validateGeocodeService(config?.locator?.url).then((urlCheckResult) => {
      !this.state.isHadEnterGeocodeUrl && this.setState({isHadEnterGeocodeUrl:true})
      this.setState({
        urlCheckResult: {urlCheckResultType: urlCheckResult?.urlCheckResultType}
      });
    }).catch(err => {
      this.setState({urlCheckResult: {urlCheckResultType: UrlCheckResultType.InvalidURL}});
    })
  }
  
  onMapWidgetSelected = (useMapWidgetsId: string[]) => {
    this.props.onSettingChange({
        id: this.props.id,
        useMapWidgetIds: useMapWidgetsId
    });
  }

  onGeocodeUrlChange = (e) => {
    const value = e.target.value;
    this.setState({geocodeURL: value});
    this.validateGeocodeService(value).then((urlCheckResult) => {
      !this.state.isHadEnterGeocodeUrl && this.setState({isHadEnterGeocodeUrl:true})
      this.setState({
        urlCheckResult: {urlCheckResultType: urlCheckResult?.urlCheckResultType}
      });
    }).catch(err => {
      this.setState({urlCheckResult: {urlCheckResultType: UrlCheckResultType.InvalidURL}});
    })
  }

  onGeocodeUrlInputBlur = (e) => {
    const value = e.target.value;
    this.validateGeocodeService(value).then((urlCheckResult) => {
      if (urlCheckResult?.urlCheckResultType === UrlCheckResultType.Pass) {
        this.setState({urlCheckResult: {urlCheckResultType: urlCheckResult?.urlCheckResultType}});
        this.updateGeocodeUrl(value, urlCheckResult?.singleLineFieldName)
      } else if (this.state.geocodeURL) {
        this.setState({
          urlCheckResult: {urlCheckResultType: UrlCheckResultType.Pass},
          geocodeURL: this.state.geocodeURL
        });
      }
    }).catch(err => {
      this.setState({
        urlCheckResult: {urlCheckResultType: UrlCheckResultType.Pass},
        geocodeURL: this.state.geocodeURL
      });
    })
  }

  updateGeocodeUrl = (geocodeServiceUrl: string, singleLineFieldName: string) => {
    const { config } = this.props
    let locator = config.locator.asMutable({ deep: true })
    locator.url = geocodeServiceUrl;
    locator.singleLineFieldName = singleLineFieldName;
    this.onPropertyChange('locator', locator)
  }

  validateGeocodeService = async (geocodeServiceUrl: string): Promise<UrlCheckResult> => {
    const httpsRex = '^(([h][t]{2}[p][s])?://)'
    const urlRegExString = new RegExp(httpsRex)
    if (geocodeServiceUrl && urlRegExString.test(geocodeServiceUrl)) {
      try {
        return loadArcGISJSAPIModules(['esri/request']).then(modules => {
          const [esriRequest] = modules
          return esriRequest(geocodeServiceUrl, {
            query: {
              f: 'json'
            },
            responseType: 'json'
          }).then(res => {
            const result = res?.data || {}
            if (result?.capabilities) {
              const singleLineAddressField = result?.singleLineAddressField || {}
              return Promise.resolve({ urlCheckResultType: UrlCheckResultType.Pass, singleLineFieldName: singleLineAddressField?.name })
            } else {
              return Promise.resolve({ urlCheckResultType: UrlCheckResultType.InvalidURL } as UrlCheckResult)
            }
          })
        })
      } catch (e) {
        return Promise.resolve({ urlCheckResultType: UrlCheckResultType.InvalidURL })
      }
    } else {
      return Promise.resolve({ urlCheckResultType: UrlCheckResultType.NotHttps })
    }
  }

  handleCCChange = (event) => {
    const { config } = this.props
    let locator = config.locator.asMutable({ deep: true })
    const value = event?.target?.value
    this.setState({countryCode: value})
    locator.countryCode = value
    this.onPropertyChange('locator', locator)
  }

  handleCCAccept = value => {
    if (value) {
      this.setState({countryCode: value?.trim()});
    }
  }

  onInitialViewChange = (event) => {
    const value = event?.target?.value
    this.setState({initialView: value})
    this.onPropertyChange('initialView', value)
  }

  onAutoClosePopupChange = (event) => {
    const value = event?.target?.value
    this.setState({autoClose: value})

    if(value === ""){
      let eConfig = Immutable(this.props.config).asMutable({ deep: true })
      delete eConfig.autoClosePopup
      this.props.onSettingChange({
        id: this.props.id,
        config: eConfig
      })
    } else {
      this.onPropertyChange('autoClosePopup', parseInt(value.toString(), 10) * 1000)
    }
  }

  onZoomScaleChange = (event) => {
    const value = event?.target?.value
    this.setState({zoomScale: value})
    this.onPropertyChange('zoomscale', parseInt(value.toString(), 10))
  }

  onPopupCoordsSRChange = (event) => {
    const value = event?.target?.value
    this.setState({popupCoordsSR: value})
    this.onPropertyChange('coordinateWKID', parseInt(value.toString(), 10))
  }

  onPopupCoordsSRprecisionChange = (size) => {
    this.setState({popupCoordsSRprecision: size})
    this.onPropertyChange('coordinatePrecision', size)
  }

  handleCheckboxChange = (evt) => {
    const target = evt.currentTarget
    if (!target) return
    let cstate = {}
    cstate[target.dataset.state] = target.checked
    this.setState(cstate)
    this.onPropertyChange(target.dataset.field, target.checked)
  }

  formatMessage = (id: string, values?: { [key: string]: any }) => {
    const messages = Object.assign({}, settingsDefaultMessages, defaultMessages, jimuiDefaultMessage, jimuCoreMessages)
    return this.props.intl.formatMessage({ id: id, defaultMessage: messages[id] }, values)
  }

  onPropertyChange = (name, value) => {
    const { config } = this.props
    if (value === config[name]) {
      return
    }
    const newConfig = config.set(name, value)
    const alterProps = {
      id: this.props.id,
      config: newConfig
    }
    this.props.onSettingChange(alterProps)
  }

  onShowCoordUnitItemPanel = (index?: number, newAdded = false) => {
    this.settSidePopperAnchor(index, newAdded)
    if (index === this.index) {
      this.setState({
        showCoordUnitItemPanel: !this.state.showCoordUnitItemPanel
      })
    } else {
      this.setState({
        showCoordUnitItemPanel: true
      })
      this.index = index
    }
  }

  settSidePopperAnchor = (index?: number, newAdded = false) => {
    let node: any
    if (newAdded) {
      node = this.sidePopperTrigger.current.getElementsByClassName('add-coordunit-btn')[0]
    } else {
      node = this.sidePopperTrigger.current.getElementsByClassName('jimu-tree-item__body')[index]
    }
    this.setState({
      popperFocusNode: node
    })
  }

  onCloseCoordUnitItemPanel = () => {
    this.setState({
      showCoordUnitItemPanel: false
    })
    this.index = 0
  }

  removeCoordUnitItem = (index: number) => {
    if (this.index === index) {
      this.onCloseCoordUnitItemPanel()
    }
    // del current coodinates unit item
    const _cus = this.props.config.pointunits.asMutable({ deep: true })
    _cus.splice(index, 1)
    const cus = this.props.config.set('pointunits', _cus)

    const config = {
      id: this.props.id,
      config: cus
    } as any

    this.props.onSettingChange(config)

    if (this.index > index) {
      this.index--
    }
  }

  CreateCoordUnitItemElement = (item, index) => {
    return <div
      key={index}
      className='coordunit-item align-items-center'
    >
      <PinEsriOutlined className='coordunit-item-icon'/>
      <div className='coordunit-item-name flex-grow-1'>{item.name}</div>
      <Button
        size='sm' type="tertiary" icon
        className='p-0'
        title={this.formatMessage('delete', jimuCoreMessages)}
        aria-label={this.formatMessage('delete', jimuCoreMessages)}
        onClick={(evt) => { evt.stopPropagation(); this.removeCoordUnitItem(index) }}
      >
        <CloseOutlined />
      </Button>
    </div>
  }

  optionChangeByDrag = (fItems) => {
    const config = {
      id: this.props.id,
      config: this.props.config.set('pointunits', fItems)
    }
    this.props.onSettingChange(config)
  }

  onDTabChanged = (checked, name): void => {
    let dTabs:string[] = this.props.config?.disabledtabs?.asMutable({deep: true}) || []
    let stateName = name + 'Disabled'
    let state = {}
    state[stateName] = checked
    if(dTabs.indexOf(name) >= 0 && !checked){
      dTabs.splice(dTabs.indexOf(name), 1)
    }else{
      dTabs.push(name)
    }
    this.setState(state, ()=>{
      //check is all tabs have been disabled and if so show warning
      if(this.state.addressDisabled && this.state.coordinateDisabled && this.state.reverseDisabled && this.state.resultDisabled){
        this.setState({noVisibleTabs: true})
      } else {
        if(this.state.noVisibleTabs){
          this.setState({noVisibleTabs: false})
        }
      }
    })
    if(dTabs.indexOf(this.state.initialView) > -1){
      let nVal = (dTabs.indexOf('address') === -1)?locateType.address:(dTabs.indexOf('coordinate'))?locateType.coordinate:(dTabs.indexOf('reverse'))?locateType.reverse:null
      this.setState({initialView: nVal})
    }
    if(dTabs.length === 0){
      let eConfig = Immutable(this.props.config).asMutable({ deep: true })
      delete eConfig.disabledtabs
      this.props.onSettingChange({
        id: this.props.id,
        config: eConfig
      })
    }else{
      this.props.onSettingChange({
        id: this.props.id,
        config: this.props.config.set('disabledtabs', dTabs)
      })
    }
  }

  optionChangeForCUI = (prop: string, value: string | number | null) => {
    const currentCUI = this.props.config.pointunits[this.index]
    let cuItems
    if(prop === 'wkid' && value !== null){
      value = parseInt(value.toString(), 10)
    }
    if(prop === 'tfwkid' && value !== null){
      value = parseInt(value.toString(), 10)
    }
    if (currentCUI) {
      cuItems = this.props.config.pointunits.asMutable({ deep: true })
      if(value === null && prop === 'tfwkid'){
        const dItem = Immutable(cuItems[this.index]).asMutable({ deep: true })
        delete dItem.tfwkid
        delete dItem.transformDirection
        cuItems.splice(this.index, 1, dItem)
      }else{
        const cItem = Immutable(cuItems[this.index]).set(prop, value)
        cuItems.splice(this.index, 1, cItem.asMutable({ deep: true }))
      }
    } else { // add new
      const cuItem:any = {
        wkid: null,
        name: '',
        xlabel: '',
        ylabel: '',
        example: ''
      }
      const newCuItem = Immutable(cuItem).set(prop, value)
      cuItems = this.props.config.pointunits.concat(Immutable([Immutable(newCuItem)]))
    }

    const config = {
      id: this.props.id,
      config: this.props.config.set('pointunits', cuItems)
    } as any
    this.props.onSettingChange(config)
  }

  createCoordUnitItems = (isEditingState: boolean) => {
    return (
      <div className={`coordunit-items-container ${this.props.config.pointunits.length > 1 ? 'mt-2' : 'mt-3'}`}>
        <List
          size='sm'
          className='setting-ui-unit-list'
          itemsJson={this.props.config.pointunits.asMutable().map((i, x) => ({ itemStateDetailContent: i, itemKey: `${x}` }))}
          dndEnabled
          onDidDrop={(actionData, refComponent) => {
            const { itemJsons: [, listItemJsons] } = refComponent.props
            this.optionChangeByDrag((listItemJsons as any).map(i => i.itemStateDetailContent))
          }}
          onClickItemBody={(actionData, refComponent) => {
            const { itemJsons } = refComponent.props
            const currentItemJson = itemJsons[0]
            const listItemJsons = itemJsons[1] as any
            this.onShowCoordUnitItemPanel(listItemJsons.indexOf(currentItemJson))
          }}
          isItemFocused={(actionData, refComponent) => {
            const { itemJsons: [currentItemJson] } = refComponent.props
            return this.state.showCoordUnitItemPanel && this.index + '' === currentItemJson.itemKey
          }}
          overrideItemBlockInfo={({ itemBlockInfo }) => {
            return {
              name: TreeItemActionType.RenderOverrideItem,
              children: [{
                name: TreeItemActionType.RenderOverrideItemDroppableContainer,
                children: [{
                  name: TreeItemActionType.RenderOverrideItemDraggableContainer,
                  children: [{
                    name: TreeItemActionType.RenderOverrideItemBody,
                    children: [{
                      name: TreeItemActionType.RenderOverrideItemDragHandle
                    }, {
                      name: TreeItemActionType.RenderOverrideItemMainLine
                    }]
                  }]
                }]
              }]
            }
          }}
          renderOverrideItemMainLine={(actionData, refComponent) => {
            const { itemJsons } = refComponent.props
            const currentItemJson = itemJsons[0]
            const listItemJsons = itemJsons[1] as any
            return this.CreateCoordUnitItemElement(currentItemJson.itemStateDetailContent, listItemJsons.indexOf(currentItemJson))
          }}
        />

        {
          isEditingState && <List size='sm' className='mt-1'
          itemsJson={[{
            itemKey: this.index + '',
            itemStateIcon: () => ({ icon: PinEsriOutlined2, size: 14 }),
            itemStateTitle: '......',
            itemStateCommands: []
          }]}
          dndEnabled={false}
          isItemFocused={() => true}
          overrideItemBlockInfo={(itemBlockInfo) => {
            return {
              name: TreeItemActionType.RenderOverrideItem,
              children: [{
                name: TreeItemActionType.RenderOverrideItemDroppableContainer,
                children: [{
                  name: TreeItemActionType.RenderOverrideItemDraggableContainer,
                  children: [{
                    name: TreeItemActionType.RenderOverrideItemBody,
                    children: [
                      {
                        name: TreeItemActionType.RenderOverrideItemMainLine,
                        children: [{
                          name: TreeItemActionType.RenderOverrideItemDragHandle
                        }, {
                          name: TreeItemActionType.RenderOverrideItemIcon
                        }, {
                          name: TreeItemActionType.RenderOverrideItemTitle
                        }]
                      }]
                  }]
                }]
              }]
            }
          }}
          />
        }
      </div>
    )
  }

  getInitialViewOptions = (): JSX.Element[] => {
    let opts = ['address', 'coordinate', 'reverse']
    let optsLbls = [this.formatMessage('addresslabel'),this.formatMessage('coordslabel'),this.formatMessage('addressinsplabel')]
    let dTabs:string[] = this.props.config?.disabledtabs?.asMutable({deep: true}) || []
    const optionsArray = [];
    opts.map((opt, index)=>{
      if(dTabs.indexOf(opt) === -1){
        optionsArray.push(<option value={opt}>{optsLbls[index]}</option>);
      }
    })
    return optionsArray;
  }

  render() {
    const { config } = this.props
    const {geocodeURL, isHadEnterGeocodeUrl, urlCheckResult, countryCode, initialView, autoClose,
      zoomScale, forceScale, keepInspectorActive, limit2ViewExtent, popupCoordsSR, addressDisabled,
      coordinateDisabled, reverseDisabled, resultDisabled, popupCoordsSRprecision, noVisibleTabs} = this.state;
    const isEditingState = config.pointunits.length === this.index && this.state.showCoordUnitItemPanel
    const hasItems = config.pointunits.length > 0 || isEditingState
      return (
      <div css={getStyleForWidget(this.props.theme)}>
        <div className='jimu-widget-setting widget-setting-elocate w-100' style={{height: 'calc(100% - 40px)',overflow: 'auto'}}>
          <SettingSection className="map-selector-section" title={this.formatMessage('configeLocate')}>
            <SettingRow label={this.formatMessage('selectMapWidget')} />
            <SettingRow>
              <MapWidgetSelector onSelect={this.onMapWidgetSelected} useMapWidgetIds={this.props.useMapWidgetIds} />
            </SettingRow>
          </SettingSection>
          <SettingSection>
            <SettingRow flow='wrap' label={this.formatMessage('locatorUrl')}>
              <TextArea
                placeholder={this.formatMessage('enterUrl')}
                value={geocodeURL || ''}
                style={{
                  minHeight: polished.rem(100)
                }}
                onChange={this.onGeocodeUrlChange}
                onBlur={this.onGeocodeUrlInputBlur}
              />
              <div className='mt-2 text-break'><i style={{ fontSize: polished.rem(12), color: this.props.theme.colors?.palette?.dark[500] }} dangerouslySetInnerHTML={{ __html: DefaultGeocodeURL }}/></div>
              {(urlCheckResult.urlCheckResultType !== UrlCheckResultType.Pass && isHadEnterGeocodeUrl) && <div className='d-flex w-100 align-items-center justify-content-between mt-1'>
                <WarningOutlined size={16} color={this.props.theme.colors?.palette?.danger[500]}/>
                <div
                  style={{
                    width: 'calc(100% - 20px)',
                    margin: '0 4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: this.props.theme.colors?.palette?.danger[500],
                    fontWeight: 'bold'
                  }}
                >
                  {urlCheckResult.urlCheckResultType === UrlCheckResultType.NotHttps ? this.formatMessage('onlySupportedHTTPS') : this.formatMessage('invalidUrlMessage')}
                </div>
              </div>}
            </SettingRow>
            {(urlCheckResult.urlCheckResultType === UrlCheckResultType.Pass) &&<SettingRow flow='wrap' label={this.formatMessage('contryCodeLbl')}>
              <TextInput size='sm' value={countryCode || ''} onChange={this.handleCCChange} onAcceptValue={this.handleCCAccept} className='w-100' placeholder={this.formatMessage('countryCodeExamples')}/>
              <div className='mt-2 text-break'><i style={{ fontSize: polished.rem(12), color: this.props.theme.colors?.palette?.dark[500] }}>{this.formatMessage('countryCodeBlank')}</i></div>
            </SettingRow>}
          </SettingSection>
          <SettingSection className={hasItems ? '' : 'border-0'} role='group'>
            <div ref={this.sidePopperTrigger}>
              <SettingRow label={<span id='newCoordUnitDesc'>{this.formatMessage('newCoordUnit')}</span>} flow='wrap' />
              <SettingRow className='mt-2' >
                <Button
                  type='primary'
                  className='w-100 text-dark add-coordunit-btn'
                  aria-label={this.formatMessage('newCoordUnit')}
                  aria-describedby={'newCoordUnitDesc'}
                  onClick={() => { this.onShowCoordUnitItemPanel(config.pointunits.length, true) }}
                >
                  <div className='w-100 px-2 text-truncate'>
                    <PlusOutlined className='mr-1' />
                    {this.formatMessage('mapCoordUnit')}
                  </div>
                </Button>
              </SettingRow>
              {
                hasItems && <React.Fragment>
                  { this.createCoordUnitItems(isEditingState) }
                </React.Fragment>
              }
            </div>
          </SettingSection>
          <SettingSection>
            <SettingRow flow='wrap' label={this.formatMessage('initView')}>
              <Select onChange={this.onInitialViewChange} className="top-drop" value={initialView}>
                {this.getInitialViewOptions()}
              </Select>
            </SettingRow>
            <SettingRow flow='wrap' label={this.formatMessage('infowindowautoclose')}>
              <TextInput size='sm' value={autoClose || ''} onChange={this.onAutoClosePopupChange} className='w-100'/>
              <div className='mt-2 text-break'><i style={{ fontSize: polished.rem(12), color: this.props.theme.colors?.palette?.dark[500] }}>{this.formatMessage('autoclosetip')}</i></div>
            </SettingRow>
            <SettingRow flow='wrap' label={this.formatMessage('zoomScale')}>
              <TextInput size='sm' value={zoomScale || ''} onChange={this.onZoomScaleChange} className='w-100'/>
            </SettingRow>
            <SettingRow>
              <div className='d-flex w-100'>
                <Checkbox
                  data-field='forcescale'
                  data-state='forceScale'
                  onClick={this.handleCheckboxChange}
                  checked={forceScale}
                />
                <div className='text-truncate ml-2' title={this.formatMessage('forcescale')}>{this.formatMessage('forcescale')}</div>
              </div>
            </SettingRow>
            <SettingRow flow='wrap' label={this.formatMessage('popupCoordsSR')}>
              <TextInput size='sm' value={popupCoordsSR || ''} onChange={this.onPopupCoordsSRChange} className='w-100'/>
            </SettingRow>
            <SettingRow flow='wrap' label={this.formatMessage('popupCoordsSRprecision')}>
              <NumericInput size='sm' onChange={this.onPopupCoordsSRprecisionChange} 
                value={popupCoordsSRprecision} className="fontrotationinput" style={{width: '80px'}}
                showHandlers={true} min={0} max={12}></NumericInput>
            </SettingRow>
            <SettingRow>
              <div className='d-flex w-100'>
                <Checkbox
                  data-field='keepinspectoractive'
                  data-state='keepInspectorActive'
                  onClick={this.handleCheckboxChange}
                  checked={keepInspectorActive}
                />
                <div className='text-truncate ml-2' title={this.formatMessage('keepactive')}>{this.formatMessage('keepactive')}</div>
              </div>
            </SettingRow>
            <SettingRow>
              <div className='d-flex w-100'>
                <Checkbox
                  data-field='limitsearchtoviewextentbydefault'
                  data-state='limit2ViewExtent'
                  onClick={this.handleCheckboxChange}
                  checked={limit2ViewExtent}
                />
                <div className='text-truncate ml-2' title={this.formatMessage('limittoviewextent')}>{this.formatMessage('limittoviewextent')}</div>
              </div>
            </SettingRow>
          </SettingSection>
          <SettingSection title={this.formatMessage('editdisabledtaboptions')}>
            {noVisibleTabs && <div className='d-flex w-100 align-items-center justify-content-between mt-1'>
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
                  {this.formatMessage('noVisibleTabsWarning')}
                </div>
              </div>
            }
            <SettingRow label={this.formatMessage('addresslabel')}>
              <Switch className='can-x-switch' data-key='address' title={this.formatMessage('addresslabel')}
                onChange={evt => { this.onDTabChanged(evt.target.checked, 'address') }}
                checked={addressDisabled} ></Switch>
            </SettingRow>
            <SettingRow label={this.formatMessage('coordslabel')}>
              <Switch className='can-x-switch' data-key='coordinate' title={this.formatMessage('coordslabel')}
                onChange={evt => { this.onDTabChanged(evt.target.checked, 'coordinate') }}
                checked={coordinateDisabled} ></Switch>
            </SettingRow>
            <SettingRow label={this.formatMessage('addressinsplabel')}>
              <Switch className='can-x-switch' data-key='reverse' title={this.formatMessage('addressinsplabel')}
                onChange={evt => { this.onDTabChanged(evt.target.checked, 'reverse') }}
                checked={reverseDisabled} ></Switch>
            </SettingRow>
            <SettingRow label={this.formatMessage('resultslabel')}>
              <Switch className='can-x-switch' data-key='result' title={this.formatMessage('resultslabel')}
                onChange={evt => { this.onDTabChanged(evt.target.checked, 'result') }}
                checked={resultDisabled} ></Switch>
            </SettingRow>
          </SettingSection>
          <SidePopper
            position='right'
            title={(isEditingState)?this.formatMessage('addUnit'):this.formatMessage('editUnit')}
            isOpen={this.state.showCoordUnitItemPanel && !urlUtils.getAppIdPageIdFromUrl().pageId}
            trigger={this.sidePopperTrigger?.current}
            backToFocusNode={this.state.popperFocusNode}
            toggle={this.onCloseCoordUnitItemPanel}
          >
            <CoordUnitItem
              optionChange={this.optionChangeForCUI} {...config.pointunits[this.index]} intl={this.props.intl} theme={this.props.theme}            />
          </SidePopper>
        </div>
      </div>
      )
  }
}