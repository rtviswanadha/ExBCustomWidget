/** @jsx jsx */
/**
 2/25/2022 
 * Fixed 0 coordinate percision issue
 * Added warning if all tabs disabled
 * when popup wkid = 4326 then coordinates labeled as lat lon and x,y values swapped
 * example tooltip added to example values
 * Added widget info modal dialog
*/
import { React, AllWidgetProps, jsx, classNames, IMState, WidgetState} from 'jimu-core'
import {IMConfig, listItem, locateType, pointunit} from '../config'
import {Tabs, Tab, Button, Select, TextInput, Checkbox, Label,
  Modal, ModalBody, ModalFooter, ModalHeader} from 'jimu-ui'
import defaultMessages from './translations/default'
import {JimuMapView, JimuMapViewComponent} from 'jimu-arcgis'
import {getStyle} from './lib/style'
import List from './components/list'
import locator from "esri/rest/locator"
import GraphicsLayer from "esri/layers/GraphicsLayer"
import esriRequest from "esri/request"
import SpatialReference from "esri/geometry/SpatialReference"
import Point from 'esri/geometry/Point'
import Graphic from "esri/Graphic"
import PopupTemplate from "esri/PopupTemplate"
import webMercatorUtils from "esri/geometry/support/webMercatorUtils"
import ProjectParameters from "esri/rest/support/ProjectParameters"
import GeometryService from "esri/rest/geometryService"
import esriConfig from "esri/config"
import AddressCanidate from "esri/rest/support/AddressCandidate"
import PictureMarkerSymbol from "esri/symbols/PictureMarkerSymbol"
import SimpleMarkerSymbol from "esri/symbols/SimpleMarkerSymbol"

interface State {
	jimuMapView: JimuMapView
	messageOpen: boolean
	messageTitle: string
	messageBody: string
	showBusy: boolean
	showProgress: boolean
	showClear: boolean
  resultListCnt: number
  addressInputValue: string
  selectedUnits: string
  xLabel: string
  yLabel: string
  xValue: string
  yValue: string
  exampleValue: string
  revBtnActive: boolean
  showExtentCbx: boolean
  addSearchExtent: boolean
  locating: boolean
  widgetInit: boolean
  selTab: string
  addressTabDisabled: boolean
  cooridinateTabDisabled: boolean
  reverseTabDisabled: boolean
  resultTabDisabled: boolean
}

interface geocode {
  url: string,
  singleLineFieldName: string,
  version: number
}

const pinIcon = require('./assets/i_pin1.gif')
const mailboxIcon = require('./assets/i_mailbox.gif')
const houseIcon = require('./assets/i_house.gif')

export default class Widget extends React.PureComponent<AllWidgetProps<IMConfig>, State>{
  resultMessageDiv: React.RefObject<HTMLDivElement> = React.createRef()

  static mapExtraStateProps = (state: IMState) => {
    return {
      widgetsRuntimeInfo: state.widgetsRuntimeInfo
    }
  }

	resultListRecords: listItem[]
  viewClickHandler: IHandle
  defaultTabId: string
  geomService: GeometryService
  graphicsLayer: GraphicsLayer
  drawLayer: GraphicsLayer
  pointSymbol: SimpleMarkerSymbol
  rGeoMarkerSymbol: PictureMarkerSymbol
  _locatorUrl: "//geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer"
  geocode: geocode
  serviceWKID: null
  minscore: number
  timer: ReturnType<typeof setTimeout>
  autoCloseNum: number
  infoWinMouseOver: any
  infoWinMouseOut: any
  coordinatePrecision: number
  initConfig: any

	constructor(props) {
    super(props)
    const {config} = this.props
    this.initConfig = config
		this.state = {
			jimuMapView: undefined,
			messageOpen: false,
      messageTitle: '',
      messageBody: '',
      showBusy: true,
			showProgress: false,
			showClear: false,
      resultListCnt: 0,
      addressInputValue: '',
      selectedUnits: config.pointunits[0].name,
      xLabel: config.pointunits[0].xlabel,
      yLabel: config.pointunits[0].ylabel,
      xValue: undefined,
      yValue: undefined,
      exampleValue: config.pointunits[0].example,
      revBtnActive: false,
      showExtentCbx: true,
      addSearchExtent: config.limitsearchtoviewextentbydefault,
      locating: false,
      widgetInit: false,
      selTab: config.initialView === locateType.address ? "addresslabel" : config.initialView === locateType.coordinate ? "coordslabel" : config.initialView === locateType.reverse ? "addressinsplabel" : "",
      addressTabDisabled: config.disabledtabs?.indexOf('address') > -1 || false,
      cooridinateTabDisabled: config.disabledtabs?.indexOf('coordinate') > -1 || false,
      reverseTabDisabled: config.disabledtabs?.indexOf('reverse') > -1 || false,
      resultTabDisabled: config.disabledtabs?.indexOf('result') > -1 || false
		}
    this.autoCloseNum = config.autoClosePopup || Number.NEGATIVE_INFINITY
    this.coordinatePrecision = (config.coordinatePrecision !== undefined) ? config.coordinatePrecision : 2
    this.defaultTabId = this.state.selTab
		this.resultListRecords = []
    this.geocode = {
      url: '',
      singleLineFieldName: '',
      version: undefined
    }
    this.rGeoMarkerSymbol = new PictureMarkerSymbol({url: houseIcon, width:'20px', height: '20px'})
	}

	nls = (id: string) => {
    return this.props.intl ? this.props.intl.formatMessage({ id: id, defaultMessage: defaultMessages[id] }) : id
  }

  componentDidMount() {
    this.setState({widgetInit: true});
    //widget-elocate jimu-widget
    (document.querySelector(".widget-elocate.jimu-widget") as HTMLElement).addEventListener('click', (evt)=> {
      if(evt.altKey){
        let mBody = '';
        mBody += this.nls('widgetverstr') + ": " + this.props.manifest.version + "\n"
        mBody += this.nls('wabversionmsg') + ": " + this.props.manifest.exbVersion + "\n\n"
        mBody += this.props.manifest.description
        this.setState({
          messageBody: mBody,
          messageTitle: this.nls('widgetversion'),
          messageOpen: true
        });
      }
    })
    const {config} = this.props
    this.initLocator()
    this.graphicsLayer = new GraphicsLayer({id:"eLocateGL", title: 'eLocate Results'})
    this.drawLayer = new GraphicsLayer({id:"DrawGL", listMode: 'hide'})
    this.pointSymbol = new SimpleMarkerSymbol({style: 'cross', size: "14pt", color:'red', outline: {color:'red', width: 2}})
    this.minscore = Number(config.minscore) || 40
  }

  componentDidUpdate() {
    const {config} = this.props;
    if(this.state.jimuMapView){
      const {view} = this.state.jimuMapView
      let widgetState: WidgetState = this.props.state
      if(widgetState === WidgetState.Closed){
        view.popup.close()
        view.map.remove(this.graphicsLayer)
        view.map.remove(this.drawLayer)
        if(this.state.revBtnActive){
          this.viewClickHandler?.remove();
          (document.querySelector(".widget-map.esri-view") as HTMLElement).style.cursor = "default"
          this.setState({revBtnActive: false})
        }
        view.popup['domNode'].removeEventListener('mouseover', this.popupMouseOverFunc)
        view.popup['domNode'].removeEventListener('mouseout', this.popupMouseOutFunc)
      }else if(widgetState === WidgetState.Opened){
        view.popup['domNode'].addEventListener('mouseover', this.popupMouseOverFunc)
        view.popup['domNode'].addEventListener('mouseout', this.popupMouseOutFunc)
        if(this.graphicsLayer && !view.map.findLayerById(this.graphicsLayer.id)){view.map.add(this.graphicsLayer)}
        if(this.drawLayer && !view.map.findLayerById(this.drawLayer.id)){view.map.add(this.drawLayer)}
      }
    }
    if(config !== this.initConfig){
      const selTab = config.initialView === locateType.address ? "addresslabel" : config.initialView === locateType.coordinate ? "coordslabel" : config.initialView === locateType.reverse ? "addressinsplabel" : ""
      this.setState({
        selTab: selTab
      })
      if(this.props.config.disabledtabs?.indexOf('address') > -1){
        this.setState({addressTabDisabled: true});
      } else {
        if(this.state.addressTabDisabled){
          this.setState({addressTabDisabled: false});
        }
      }
      if(this.props.config.disabledtabs?.indexOf('coordinate') > -1){
        this.setState({cooridinateTabDisabled: true});
      } else {
        if(this.state.cooridinateTabDisabled){
          this.setState({cooridinateTabDisabled: false});
        }
      }
      if(this.props.config.disabledtabs?.indexOf('reverse') > -1){
        this.setState({reverseTabDisabled: true});
      } else {
        if(this.state.reverseTabDisabled){
          this.setState({reverseTabDisabled: false});
        }
      }
      if(this.props.config.disabledtabs?.indexOf('result') > -1){
        this.setState({resultTabDisabled: true});
      } else {
        if(this.state.resultTabDisabled){
          this.setState({resultTabDisabled: false});
        }
      }
    }
  }

  popupMouseOverFunc = () => {
    this.disableTimer()
  }

  popupMouseOutFunc = () => {
    if(this.autoCloseNum != Number.NEGATIVE_INFINITY){
      this.timedClose()
    }
  }

	activeViewChangeHandler = (jimuMapView: JimuMapView) => {
    //Async errors
    if (null === jimuMapView || undefined === jimuMapView) {
      this.setState({ jimuMapView: null })
      return; //skip null
    }
    this.setState({ jimuMapView: jimuMapView })
    jimuMapView.whenJimuMapViewLoaded().then(()=>{
      const{map} = jimuMapView.view
      if(this.state.widgetInit){
        const sLayer: GraphicsLayer = map.findLayerById('eLocateGL') as GraphicsLayer
        if(sLayer){
          if(sLayer.graphics.length > 0){
            let gra = sLayer.graphics.getItemAt(0);
            let li: listItem = {
              title: gra.attributes['title'],
              content: gra.attributes['content'],
              type: gra.attributes['type'],
              point: gra.geometry as Point,
              graphic: gra,
              id: gra.attributes['type'] + '_id_1',
              selected: true
            }
            this.resultListRecords.push(li)
          }
          if(this.resultListRecords.length > 0){
            if(this.resultMessageDiv.current){
              this.resultMessageDiv.current.innerHTML = this.nls('resultsfoundlabel') + ' ' + this.resultListRecords.length
            }
            this.setState({resultListCnt: this.resultListRecords.length, showClear: true, widgetInit: false, selTab: 'resultslabel'})
          }
        }
      }
      if(!map.findLayerById('eLocateGL')){map.add(this.graphicsLayer)}
      if(!map.findLayerById('DrawGL')){map.add(this.drawLayer)}
      // if(this.locator){
      //   this.locator.outSpatialReference = jimuMapView.view.spatialReference;
      // }
      this.setState({showBusy: false});
    });
  }

	onRecordRemoveClick = (evt) => {
    evt.stopPropagation()
    let id: string = evt.currentTarget.id
    let locResult: listItem = this.resultListRecords.find((item, index) => {
      if(item.id === id){
        return item;
      }
    })
    this.graphicsLayer.remove(locResult.graphic)
    this.state.jimuMapView.view.popup.close()
    this.resultListRecords.splice(this.resultListRecords.findIndex(item => item.id === id), 1)
    this.setState({resultListCnt: this.resultListRecords.length})
    if(this.resultListRecords.length === 0){
      this.resultMessageDiv.current.innerHTML = ''
      this.setState({showClear: false, selTab: this.defaultTabId})
      return
    }
    this.resultMessageDiv.current.innerHTML = this.nls('resultsfoundlabel') + this.resultListRecords.length
  }

	onRecordClick = (evt) => {
    const {view} = this.state.jimuMapView
    let id: string = evt.currentTarget.id
    this.resultListRecords.map(item => item.selected = false)
    let tListItem: listItem = this.resultListRecords.find((item, index) => {
      if(item.id === id){
        item.selected = true;
        return item;
      }
    })
    view.goTo(tListItem.graphic)
    view.popup.open({fetchFeatures:true, location: tListItem.point})
    if(this.autoCloseNum != Number.NEGATIVE_INFINITY){
      this.timedClose()
    }
	}

	onRecordMouseOver = (evt) => {
  }

  onRecordMouseOut = (evt) => {
  }

  timedClose = () => {
    clearTimeout(this.timer);
    this.timer = setTimeout(()=>{
      this.state.jimuMapView.view.popup.close()
    }, this.autoCloseNum)
  }

  disableTimer = () => {
    clearTimeout(this.timer)
  }

	clearResultsHandler = (evt, setTab?: boolean) => {
    if(evt) evt.preventDefault()
    this.graphicsLayer.removeAll()
    this.resultListRecords = []
    this.resultMessageDiv.current.innerHTML = ''
    this.state.jimuMapView.view.popup.close()
    this.setState({resultListCnt: 0, locating: false, showClear: false, selTab: this.defaultTabId})
	}

  handleSearchBtnClick = () => {
    const {config} = this.props
    const {view} = this.state.jimuMapView
    this.clearResultsHandler(null, false)
    this.graphicsLayer.removeAll()
    this.setState({showProgress: true, locating: true});
    var params = {
      address: {},
      outFields: ['Loc_name','Score','Addr_type','X','Y','DisplayX','DisplayY','LongLabel','ExInfo'],
      outSpatialReference: this.state.jimuMapView.view.spatialReference
    }

    if(config.locator.countryCode){
      params["countryCode"] = config.locator.countryCode
    }
    params.address[this.geocode.singleLineFieldName] = this.state.addressInputValue
    if(this.state.addSearchExtent){
      params['searchExtent'] = view.extent
    }
    locator.addressToLocations(this.geocode.url, params).then(this.addresslocateResult, this.locateError)
  }

  addresslocateResult = (addresses: AddressCanidate[]) => {
    const {config} = this.props
    const {view} = this.state.jimuMapView
    if (addresses.length > 0){
      let gCandiateCnt:number = 0;
      addresses.map((addrCandidate, i)=>{
        if(addrCandidate.score >= this.minscore){
          gCandiateCnt++;
        }
      })
      addresses.map((addrCandidate, i)=>{
        if(addrCandidate.score >= this.minscore){
          this.createLocateResults(addrCandidate, i).then((result)=>{
            this.resultListRecords.push(result)
            this.setState({showClear: true, resultListCnt: this.resultListRecords.length})
            this.createGraphicResult(result)
            this.resultMessageDiv.current.innerHTML = this.nls('resultsfoundlabel') + ' ' + this.resultListRecords.length
            if (this.resultListRecords.length === gCandiateCnt && this.resultListRecords.length > 0){
              const locResult = this.resultListRecords[0]
              if(this.props.config.forcescale === true){
                this.setScaleAndCenter(locResult);
              }else{
                if (view.scale > config.zoomscale){
                  this.setScaleAndCenter(locResult)
                }else{
                  view.center = locResult.point
                  setTimeout(() => {
                    view.popup.open({features:[locResult.graphic], location: locResult.graphic.geometry as Point, updateLocationEnabled: true});
                    if(this.autoCloseNum != Number.NEGATIVE_INFINITY){
                      this.timedClose()
                    }
                  }, 500);
                }
              }
              this.setState({showProgress: false, locating: false, selTab: 'resultslabel'})
            }
          });
        }
      });
    }else{
      this.setState({showProgress: false, locating: false})
      this.resultMessageDiv.current.innerHTML = this.nls('noresultsfoundlabel')
    }
  }

  createGraphicResult = (locResult: listItem) => {
    let pm: PictureMarkerSymbol
    var ptGraphic = new Graphic({geometry:locResult.point})
    switch(locResult.type){
      case locateType.address:
        pm = new PictureMarkerSymbol({url: mailboxIcon, width:'24px', height: '24px'})
        break
      case locateType.coordinate:
        pm = new PictureMarkerSymbol({url: pinIcon, width:'24px', height: '24px'})
        break
      case locateType.reverse:
        pm = new PictureMarkerSymbol({url: houseIcon, width:'24px', height: '24px'})
        break
    }
    ptGraphic.symbol = pm
    var Atts = {
      content: locResult.content,
      title: locResult.title,
      gid: parseInt(locResult.id.replace('id_', '')),
      type: locResult.type
    }
    ptGraphic.attributes = Atts
    ptGraphic.popupTemplate = new PopupTemplate({
      title: locResult.title,
      content: locResult.content
    })
    this.graphicsLayer.add(ptGraphic)
    locResult.graphic = ptGraphic
  }

  createLocateResults = (addrCandidate: AddressCanidate, i: number) => {
    const {config} = this.props
    const {view} = this.state.jimuMapView
    let pnt
    const def = new Promise<listItem>((resolve)=>{
      let projecting:boolean = false
      let projParams = new ProjectParameters()
      let locateResult:Partial<listItem> = {
        title: addrCandidate.address ? String(addrCandidate.address) : addrCandidate.attributes.Street ? String(addrCandidate.attributes.Street) : this.props.manifest.name
      }
      locateResult.type = locateType.address
      if(addrCandidate.attributes.DisplayX && addrCandidate.attributes.DisplayY){
        pnt = new Point({x: addrCandidate.attributes.DisplayX, y: addrCandidate.attributes.DisplayY, spatialReference: new SpatialReference({wkid:4326})})
      }
      if(view.spatialReference.wkid !== config.coordinateWKID){
        projecting = true
        projParams.geometries = [(pnt || addrCandidate.location)]
        projParams.outSpatialReference = new SpatialReference({wkid:config.coordinateWKID})
        projecting = true
        GeometryService.project(esriConfig.geometryServiceUrl,projParams).then((results)=>{
          const rPnt = results[0] as Point
          if(config.coordinateWKID === 4326){
            locateResult.content = "<em>" + this.nls('score') + "</em>: " +
              (addrCandidate.score % 1 === 0 ? addrCandidate.score : addrCandidate.score.toFixed(1)) +
              "<br><em>" + this.nls('llcoordinates') + "</em>: " +
              (rPnt.y).toFixed(this.coordinatePrecision) + ", " + (rPnt.x).toFixed(this.coordinatePrecision)
          } else {
            locateResult.content = "<em>" + this.nls('score') + "</em>: " +
              (addrCandidate.score % 1 === 0 ? addrCandidate.score : addrCandidate.score.toFixed(1)) +
              "<br><em>" + this.nls('coordinates') + "</em>: " +
              (rPnt.x).toFixed(this.coordinatePrecision) + ", " + (rPnt.y).toFixed(this.coordinatePrecision)
          }
          
          resolve(locateResult as listItem)
        });
      }
      if(config.coordinateWKID === 4326){
        locateResult.content = "<em>" + this.nls('score') + "</em>: " +
          (addrCandidate.score % 1 === 0 ? addrCandidate.score : addrCandidate.score.toFixed(1)) +
          "<br><em>" + ((config.coordinateWKID === 4326) ? this.nls('llcoordinates') : this.nls('coordinates')) + "</em>: " +
          (addrCandidate.location.y).toFixed(this.coordinatePrecision) + ", " + (addrCandidate.location.x).toFixed(this.coordinatePrecision)
      } else {
        locateResult.content = "<em>" + this.nls('score') + "</em>: " +
          (addrCandidate.score % 1 === 0 ? addrCandidate.score : addrCandidate.score.toFixed(1)) +
          "<br><em>" + this.nls('coordinates') + "</em>: " +
          (addrCandidate.location.x).toFixed(this.coordinatePrecision) + ", " + (addrCandidate.location.y).toFixed(this.coordinatePrecision)
      }

      locateResult.point = pnt || addrCandidate.location
      locateResult.id = locateType.address + '_id_' + i
      if (!locateResult.point.spatialReference && !isNaN(this.serviceWKID)){ // AGS 9.X returns locations w/o a SR and doesn't support outSR
        locateResult.point.spatialReference = new SpatialReference({wkid: this.serviceWKID})
        if (webMercatorUtils.canProject(locateResult.point, view.spatialReference)) {
          locateResult.point = webMercatorUtils.project(locateResult.point, view.spatialReference) as Point
        }else{
          projParams.geometries = [locateResult.point]
          projParams.outSpatialReference = view.spatialReference
          GeometryService.project(esriConfig.geometryServiceUrl,projParams).then((results)=>{
            locateResult.point = results[0] as Point
          }, this.geometryService_faultHandler)
        }
      }else if (locateResult.point.spatialReference){
        if (webMercatorUtils.canProject(locateResult.point, view.spatialReference)) {
          locateResult.point = webMercatorUtils.project(locateResult.point, view.spatialReference) as Point
        }else{
          projecting = true
          projParams.geometries = [locateResult.point]
          projParams.outSpatialReference = view.spatialReference
          GeometryService.project(esriConfig.geometryServiceUrl,projParams).then((results)=>{
            locateResult.point = results[0] as Point
            resolve(locateResult as listItem)
          }, this.geometryService_faultHandler)
        }
      }
      if(!projecting){
        resolve(locateResult as listItem)
      }
    });
    return def
  }

  onSearchError = (error) => {
    this.clearResultsHandler(null, true)
    this.setState({
      showProgress: false,
      locating: false,
      showClear: false,
      messageBody: this.nls('searchError'),
      messageTitle: '',
      messageOpen: true
    })
    console.debug(error)
  }

  clearLayer = () => {
    this.graphicsLayer.removeAll()
  }

  handlmessageOK = () => {
    this.setState({ messageOpen: false })
  }

  dms_to_deg = (dmsStr: string) => {
    var negNum = false
    if(dmsStr.toLowerCase().indexOf("w") > -1){
      negNum = true
    }
    if(dmsStr.toLowerCase().indexOf("s") > -1){
      negNum = true
    }
    var myPattern = /[WwnNEeSs ]/g
    dmsStr = dmsStr.replace(myPattern, "")
    var dmsArr = dmsStr.split("-")

    //Compute degrees, minutes and seconds:
    var sec = Number(dmsArr[2]) / 60
    var min = sec + Number(dmsArr[1])
    var dec = min / 60
    var fDeg = dec + Number(dmsArr[0])
    if(negNum){
      fDeg = -Math.abs(fDeg)
    }
    return fDeg
  }

  dm_to_deg = (dmStr: string) => {
    var negNum = false
    if(dmStr.toLowerCase().indexOf("w") > -1){
      negNum = true
    }
    if(dmStr.toLowerCase().indexOf("s") > -1){
      negNum = true
    }
    var myPattern = /[WwnNEeSs ]/g
    dmStr = dmStr.replace(myPattern, "")
    var dmArr = dmStr.split("-")
    //Compute degrees, minutes:
    var min = Number(dmArr[1])
    var dec = min / 60
    var fDeg = dec + Number(dmArr[0])
    if(negNum){
      fDeg = -Math.abs(fDeg)
    }
    return fDeg
  }

  prelocateCoords = () => {
    this.clearResultsHandler(null, false)
    const {config} = this.props
    const {view} = this.state.jimuMapView
    const long = this.state.xValue
    const lat = this.state.yValue
    if (long && lat){
      let numLong = parseFloat(long)
      let numLat = parseFloat(lat)
      const index = config.pointunits.findIndex(u => u.name === this.state.selectedUnits)
      const uObj: pointunit = config.pointunits[index]
      if(uObj.wkid === this.state.jimuMapView.view.spatialReference.wkid || uObj.wgs84option == "map"){
        this.locateCoordinates()
      }else{
        this.setState({showProgress: true, resultListCnt: 0})
        var point, wmPoint
        if(uObj.wgs84option == "dms"){
          numLong = this.dms_to_deg(this.state.xValue)
          numLat = this.dms_to_deg(this.state.yValue)
          point = new Point({longitude: numLong, latitude:numLat, spatialReference: new SpatialReference({wkid: uObj.wkid})})
          if (webMercatorUtils.canProject(point.spatialReference, view.spatialReference)) {
            wmPoint = webMercatorUtils.project(point, view.spatialReference)
            this.projectCompleteHandler2([wmPoint])
            return
          }
        }else if(uObj.wgs84option == "dm" || uObj.wgs84option == "ddm"){
          numLong = this.dm_to_deg(long)
          numLat = this.dm_to_deg(lat)
          point = new Point({longitude: numLong, latitude:numLat, spatialReference: new SpatialReference({wkid: uObj.wkid})})
          if (webMercatorUtils.canProject(point.spatialReference, view.spatialReference)) {
            wmPoint = webMercatorUtils.project(point, view.spatialReference)
            this.projectCompleteHandler2([wmPoint])
            return
          }
        } else {
          point = new Point({longitude: numLong, latitude:numLat, spatialReference: new SpatialReference({wkid: uObj.wkid})})
          if (webMercatorUtils.canProject(point.spatialReference, view.spatialReference)) {
            wmPoint = webMercatorUtils.project(point, view.spatialReference)
            this.projectCompleteHandler2([wmPoint])
            return
          }
        }

        var projParams = new ProjectParameters()
        projParams.geometries = [point]
        projParams.outSpatialReference = view.spatialReference
        if(uObj.tfwkid){
          projParams.transformation = {wkid: uObj.tfwkid}
          projParams.transformForward = uObj.transformDirection === 'forward' ?  true : false
        }
        GeometryService.project(esriConfig.geometryServiceUrl,projParams).then(this.projectCompleteHandler2, this.geometryService_faultHandler)
      }
    }
  }

  locateCoordinates = () => {
    const {view} = this.state.jimuMapView
    this.resultListRecords = []
    this.setState({resultListCnt: 0})
    let long = this.state.xValue
    let lat = this.state.yValue
    if (long && lat){
      let numLong = Number(long)
      let numLat = Number(lat)
      if (!isNaN(numLong) && !isNaN(numLat)){
        this.setState({resultListCnt: -1})
        let li: listItem = {
          title: this.nls('coordslabel'),
          content: "<em>" + this.nls('location') + "</em>: " + long + ", " + lat,
          type: locateType.coordinate,
          point: new Point({x: numLong, y:numLat, spatialReference: view.spatialReference}),
          id: locateType.coordinate + '_id_1'
        }
        this.resultListRecords.push(li)
        this.showLocation(li)
        this.resultMessageDiv.current.innerHTML = this.nls('resultsfoundlabel') + ' ' + this.resultListRecords.length
        this.setState({
          resultListCnt: this.resultListRecords.length,
          showProgress: false,
          showClear: true,
          locating: false,
          selTab: 'resultslabel'
        });
        this.forceUpdate()
      }
    }
  }

  showLocation = (locResult:listItem) => {
    const {view} = this.state.jimuMapView
    const {config} = this.props
    this.state.jimuMapView.view.popup.close()
    this.graphicsLayer.removeAll()
    let pm: PictureMarkerSymbol
    var ptGraphic = new Graphic({geometry:locResult.point})
    switch(locResult.type){
      case locateType.address:
        pm = new PictureMarkerSymbol({url: mailboxIcon, width:'24px', height: '24px'})
        break
      case locateType.coordinate:
        pm = new PictureMarkerSymbol({url: pinIcon, width:'24px', height: '24px'})
        break
      case locateType.reverse:
        pm = new PictureMarkerSymbol({url: houseIcon, width:'24px', height: '24px'})
        break
    }
    ptGraphic.symbol = pm
    var Atts = {
      content: locResult.content,
      title: locResult.title,
      gid: parseInt(locResult.id.replace('id_', '')),
      type: locResult.type
    }
    ptGraphic.attributes = Atts
    ptGraphic.popupTemplate = new PopupTemplate({
      title: locResult.title,
      content: locResult.content
    })
    this.graphicsLayer.add(ptGraphic)

    locResult.graphic = ptGraphic
    if(this.props.config.forcescale === true){
      this.setScaleAndCenter(locResult)
    }else{
      if (view.scale > config.zoomscale){
        this.setScaleAndCenter(locResult)
      }else{
        view.center = locResult.point;
        setTimeout(() => {
          view.popup.open({fetchFeatures:true, location: locResult.point})
          if(this.autoCloseNum != Number.NEGATIVE_INFINITY){
            this.timedClose()
          }
        }, 500)
      }
    }
    this.setState({showClear: true})
  }

  setScaleAndCenter = (locResult:listItem) => {
    const {view} = this.state.jimuMapView
    const {config} = this.props
    view.scale = config.zoomscale
    view.center = locResult.point
    setTimeout(() => {
      view.popup.open({fetchFeatures:true, location: locResult.point})
      if(this.autoCloseNum != Number.NEGATIVE_INFINITY){
        this.timedClose()
      }
    }, 500)
  }

  geometryService_faultHandler = (err) => {
    console.info(err)
    this.setState({showProgress: false, locating: false})
    this.resultMessageDiv.current.innerHTML = this.nls('projectissue')
  }

  projectCompleteHandler2 = (results) => {
    const {view} = this.state.jimuMapView
    if (this.resultListRecords){
      this.resultListRecords = []
    }
    this.setState({resultListCnt: 0})
    try{
      let long = this.state.xValue
      let lat = this.state.yValue
      if (long && lat){
        let li: listItem = {
          title: this.nls('coordslabel'),
          content: "<em>" + this.nls('location') + "</em>: " + long + ", " + lat,
          type: locateType.coordinate,
          point: results[0],
          id: locateType.coordinate + '_id_1'
        }
        this.resultListRecords.push(li)
        this.showLocation(li)
        this.resultMessageDiv.current.innerHTML = this.nls('resultsfoundlabel') + ' ' + this.resultListRecords.length
        this.setState({showProgress: false, locating: false, resultListCnt: this.resultListRecords.length, selTab: 'resultslabel'})
      }
    }
    catch (error){
      console.info(error)
    }
  }

  addressValueChange = (evt) => {
    const value = evt?.target?.value
    this.setState({addressInputValue: value})
  }

  handleOnUnitsChange = (evt) => {
    const value = evt?.target?.value
    const {config} = this.props
    const index = config.pointunits.findIndex(u => u.name === value)
    const uObj: pointunit = config.pointunits[index]
    this.setState({
      xLabel: uObj.xlabel,
      selectedUnits: value,
      yLabel: uObj.ylabel,
      xValue: '',
      yValue: '',
      exampleValue: uObj.example
    })
  }

  getUnitsOptions = (): JSX.Element[] => {
    const optionsArray = []
    this.props.config.pointunits.map((unit, index) => {
      optionsArray.push(<option key={index} value={unit.name}>{unit.name}</option>);
    })
    return optionsArray
  }

  xValueChange = (evt) => {
    const value = evt?.target?.value
    this.setState({xValue: value})
  }

  yValueChange = (evt) => {
    const value = evt?.target?.value
    this.setState({yValue: value})
  }

  setExample = () => {
    const {config} = this.props
    const index = config.pointunits.findIndex(u => u.name === this.state.selectedUnits)
    const uObj: pointunit = config.pointunits[index]
    const exampleArr = uObj.example.split(",")
    this.setState({xValue: exampleArr[0], yValue: exampleArr[1]})
  }

  handleRevGeocodeBtnClick = () => {
    if(this.state.revBtnActive){
      this.setState({revBtnActive: false});
      (document.querySelector(".widget-map.esri-view") as HTMLElement).style.cursor = "default"
      this.viewClickHandler?.remove()
      return
    }
    this.setState({revBtnActive: true});
    (document.querySelector(".widget-map.esri-view") as HTMLElement).style.cursor = "crosshair"
    this.viewClickHandler = this.state.jimuMapView.view.on('click', (event) => {
      event.stopPropagation()
      var g = new Graphic({geometry:event.mapPoint, symbol: this.pointSymbol})
      this.drawLayer.removeAll()
      this.drawLayer.add(g)
      locator.locationToAddress(this.geocode.url,{location: event.mapPoint, outSpatialReference:this.state.jimuMapView.view.spatialReference}).then(this.rlocateResult, this.locateError)
      if(!this.props.config.keepinspectoractive){
        this.viewClickHandler?.remove();
        (document.querySelector(".widget-map.esri-view") as HTMLElement).style.cursor = "default"
        this.setState({revBtnActive: false})
      }
    });
  }

  locateError = (info) => {
    console.error(info);
    if(!this.props.config.keepinspectoractive){
      this.setState({revBtnActive: false})
      this.viewClickHandler?.remove()
    }
    this.setState({
      messageBody: this.nls('reversegeocodefailmsg'),
      messageTitle: this.nls('reversegeocodefailtitle'),
      messageOpen: true
    });
  }
  
  rlocateResult = (canidate:AddressCanidate) => {
    const {view} = this.state.jimuMapView
    this.clearResultsHandler(null, false)
    const that = this
    this.createAddressInspectorResult(canidate).then((result)=>{
      that.resultListRecords.push(result)
      this.setState({resultListCnt: this.resultListRecords.length})
      that.resultMessageDiv.current.innerHTML = that.nls('resultsfoundlabel') + ' ' + that.resultListRecords.length
      if (that.resultListRecords.length > 0){
        that.drawLayer.removeAll()
        that.showLocation(that.resultListRecords[0])
        this.setState({selTab: 'resultslabel'})
      }
    });
  }

  createAddressInspectorResult = (addrCandidate:AddressCanidate):Promise<listItem> => {
    const {config} = this.props
    const {view} = this.state.jimuMapView
    const def = new Promise<listItem>((resolve) => {
      var sAdd = addrCandidate.address
      let locateResult:Partial<listItem> = {
        title: addrCandidate.address ? String(addrCandidate.address) : addrCandidate.attributes.Street ? String(addrCandidate.attributes.Street) : this.props.manifest.name
      }
      var projecting = false
      locateResult.type = locateType.reverse
      var projParams = new ProjectParameters()
      if(config.coordinateWKID && view.spatialReference.wkid !== config.coordinateWKID){
        projParams.geometries = [addrCandidate.location]
        projParams.outSpatialReference = new SpatialReference({wkid:config.coordinateWKID})
        projecting = true
        GeometryService.project(esriConfig.geometryServiceUrl,projParams).then(results=>{
          const rPnt:Point = results[0] as Point
          if(config.coordinateWKID === 4326){
            locateResult.content =  "<em>" + this.nls('address') + "</em>: " +
              sAdd + "<br><em>" + this.nls('llcoordinates') + "</em>: " +
              (rPnt.y).toFixed(this.coordinatePrecision) + ", " + (rPnt.x).toFixed(this.coordinatePrecision)
          } else {
            locateResult.content =  "<em>" + this.nls('address') + "</em>: " +
              sAdd + "<br><em>" + this.nls('coordinates') + "</em>: " +
              (rPnt.x).toFixed(this.coordinatePrecision) + ", " + (rPnt.y).toFixed(this.coordinatePrecision)
          }
          resolve(locateResult as listItem)
        });
      }
      if(config.coordinateWKID === 4326){
        locateResult.content = "<em>" + this.nls('address') + "</em>: " +
          sAdd + "<br><em>" + this.nls('llcoordinates') + "</em>: " +
          (addrCandidate.location.y).toFixed(this.coordinatePrecision) + ", " + (addrCandidate.location.x).toFixed(this.coordinatePrecision)
      } else {
        locateResult.content = "<em>" + this.nls('address') + "</em>: " +
          sAdd + "<br><em>" + this.nls('coordinates') + "</em>: " +
          (addrCandidate.location.x).toFixed(this.coordinatePrecision) + ", " + (addrCandidate.location.y).toFixed(this.coordinatePrecision)
      }
      locateResult.point = addrCandidate.location
      locateResult.id = locateType.reverse + '_id_1'

      if (!locateResult.point.spatialReference && !isNaN(this.serviceWKID)){ // AGS 9.X returns locations w/o a SR and doesn't support outSR
        locateResult.point.spatialReference = new SpatialReference({wkid: this.serviceWKID})
        if (webMercatorUtils.canProject(locateResult.point, view.spatialReference)) {
          locateResult.point = webMercatorUtils.project(locateResult.point, view.spatialReference) as Point
        }else{
          projParams.geometries = [locateResult.point]
          projParams.outSpatialReference = view.spatialReference
          GeometryService.project(esriConfig.geometryServiceUrl,projParams).then((results)=>{
            locateResult.point = results[0] as Point
          }, this.geometryService_faultHandler)
        }
      }else if (locateResult.point.spatialReference){
        if (webMercatorUtils.canProject(locateResult.point, view.spatialReference)) {
          locateResult.point = webMercatorUtils.project(locateResult.point, view.spatialReference) as Point
        }else{
          projecting = true
          projParams.geometries = [locateResult.point]
          projParams.outSpatialReference = view.spatialReference
          GeometryService.project(esriConfig.geometryServiceUrl,projParams).then((results)=>{
            locateResult.point = results[0] as Point
            resolve(locateResult as listItem)
          }, this.geometryService_faultHandler)
        }
      }
      if(!projecting){
        resolve(locateResult as listItem)
      }
    });
    return def
  }

  initLocator = () => {
    const {config} = this.props
    var locatorUrl = config.locator.url || this._locatorUrl
    this.geocode.url = locatorUrl
    this.getLocatorInfo(this.geocode).then(()=>{
      if(this.geocode){
        if(this.geocode.version < 10.1){
          this.setState({showExtentCbx: false})
        }
      }else{
        this.setState({
          messageBody: this.nls('locatorissuemessage'),
          messageTitle: this.nls('locatorissue'),
          messageOpen: true
        })
        //hide or disable the locate tab
        this.setState({addressTabDisabled: true});
      }
    });
    
  }

  getLocatorInfo = (geocode) => {
    const def = new Promise((resolve) => {
      esriRequest(geocode.url, {responseType: "json",
        query: {
          f: 'json'
        },
        timeout: 10000,
        useProxy: false}).then(response=>{
          if (response.data.singleLineAddressField && response.data.singleLineAddressField.name) {
          this.geocode.singleLineFieldName = response.data.singleLineAddressField.name
          this.geocode.version = response.data.currentVersion
          this.serviceWKID = response.data.spatialReference.wkid
          resolve(geocode)
        } else {
          console.warn(geocode.url + "has no singleLineFieldName")
          resolve(null)
        }
      }, (err)=>{
        console.error(err)
        resolve(null)
      });
    });
    return def
  }

  onTabSelect = (tabTitle) => {
   if(tabTitle !== 'resultslabel' || (tabTitle !== 'resultslabel' && this.state.resultListCnt > 0)){
      this.setState({selTab: tabTitle})
    }
  }

  AddSearchExtentChange = (evt) => {
    const target = evt.currentTarget
    if (!target) return
    this.setState({addSearchExtent: target.checked})
  }

	render(){
    const { messageOpen, messageTitle, messageBody, showBusy, selectedUnits, xLabel, yLabel, selTab,
      xValue, yValue, exampleValue, revBtnActive, showClear, addressInputValue, showProgress,
      addSearchExtent, addressTabDisabled, cooridinateTabDisabled, reverseTabDisabled, resultTabDisabled} = this.state;
    const {config, theme} = this.props;

    return <div className="widget-elocate jimu-widget" css={getStyle(theme, config)}>
      <Modal className={classNames('d-flex justify-content-center')}
        isOpen={messageOpen} centered={true}>
        <ModalHeader toggle={this.handlmessageOK} close={{}}>{messageTitle}</ModalHeader>
        <ModalBody className="text-break" style={{whiteSpace: 'pre-wrap'}}>
          {messageBody}
        </ModalBody>
        <ModalFooter>
          <Button type="primary" onClick={this.handlmessageOK}>
            {this.nls('ok')}
          </Button>
        </ModalFooter>
      </Modal>
      {showBusy &&
        <div className='light-100' style={{width:'100%', height:'100%'}}>
          <div className="jimu-secondary-loading"></div>
        </div>
      }
			{this.props.useMapWidgetIds && this.props.useMapWidgetIds.length === 1 && (
          <JimuMapViewComponent
            useMapWidgetId={this.props.useMapWidgetIds?.[0]}
            onActiveViewChange={this.activeViewChangeHandler}
          />
      )}
			<div className={showBusy?'hideTabs':'showTabs'}>
				<Tabs fill={true} onChange={this.onTabSelect} type={"tabs"} value={selTab}>
          {!addressTabDisabled &&
            <Tab id="addresslabel" title={this.nls('addresslabel')}>
            <div style={{width:'100%', height:'100%', padding:'10px'}}>
              <a style={{ 'float': 'right', marginRight: '10px', display: showClear ? "block" : "none"}}
                onClick={(e) => this.clearResultsHandler(e, true)}
                href="#">{this.nls('clear')}</a>
              <label>{this.nls('locateDescLabel')}</label>
              <br/>
              <TextInput size='sm' style={{width: '100%'}} onChange={this.addressValueChange}
                value={addressInputValue} onKeyPress={(e) => {if (e.key === 'Enter') {this.handleSearchBtnClick()}}}></TextInput>
              <div className={'d-flex'} style={{margin: '0.5rem 0'}}>
                <div style={{flexGrow: 1}}>
                  <Checkbox id='cbxAddSearchExtent' checked={addSearchExtent}
                    style={{ cursor: 'pointer' }} onChange={this.AddSearchExtentChange}></Checkbox>
                  <Label style={{ cursor: 'pointer' }} for='cbxAddSearchExtent' className="m-2">{this.nls('limittomapextent')}</Label>
                </div>
                <div>
                  <Button size='lg' type='primary' onClick={(evt)=>{this.handleSearchBtnClick()}}>{this.nls('locate')}</Button>
                </div>
              </div>
            </div>
					</Tab>
          }
					{!cooridinateTabDisabled &&
					<Tab id="coordslabel" title={this.nls('coordslabel')}>
            <div style={{width:'100%', height:'100%', padding:'10px'}}>
              <a style={{ 'float': 'right', marginRight: '10px', display: showClear ? "block" : "none"}}
                  onClick={(e) => this.clearResultsHandler(e, true)}
                  href="#">{this.nls('clear')}</a>
              <label>{this.nls('coordDescLabel')}</label>
              <br/>
              <div className={'d-flex m-2'}>
                <Label style={{width:'90px', lineHeight:'32px'}}>{this.nls('coordUnitLbl')+' '}</Label>
                <Select style={{display:'inline-block', width:'calc(100% -70px)'}} onChange={this.handleOnUnitsChange}
                  className="top-drop" value={selectedUnits}>
                  {this.getUnitsOptions()}
                </Select>
              </div>
              <div className={'d-flex m-2'}>
                <Label style={{width:'90px', lineHeight:'32px'}}>{xLabel}</Label>
                <TextInput style={{ display:'inline-block', width: 'calc(100% -70px)' }} value={xValue}
                  onChange={this.xValueChange}></TextInput>
              </div>
              <div className={'d-flex m-2'}>
                <Label style={{width:'90px', lineHeight:'32px'}}>{yLabel}</Label>
                <TextInput style={{ display:'inline-block', width: 'calc(100% -70px)' }} value={yValue}
                  onChange={this.yValueChange}></TextInput>
              </div>
              <div className={'d-flex m-2'}>
                <label style={{width:'90px'}}>{this.nls('example')}</label>
                <label style={{display:'inline-block', width:'calc(100% -70px)', cursor:'pointer'}}
                  title={this.nls('exampleClick')}
                  onClick={this.setExample}>{exampleValue}</label>
              </div>
              <div className={'d-flex m-2'}>
                <div style={{flexGrow: 1}}></div>
                <div>
                  <Button size='lg' type='primary' onClick={this.prelocateCoords}>{this.nls('locate')}</Button>
                </div>
              </div>
            </div>
					</Tab>
          }
          {!reverseTabDisabled &&
          <Tab id="addressinsplabel" title={this.nls('addressinsplabel')}>
            <div style={{width:'100%', height:'100%', padding:'10px'}}>
              <label>{this.nls('reverseDescLabel')}</label>
              <div className="revGeocodeDiv">
                <Button className='esri-icon-map-pin' size='sm' type='default' active={revBtnActive}
                  onClick={this.handleRevGeocodeBtnClick} title={this.nls('revgeocodetip')}></Button>
              </div>
            </div>
					</Tab>
          }
          {!resultTabDisabled &&
					<Tab id="resultslabel" title={this.nls('resultslabel')}>
					  <div className='d-flex flex-column' style={{width:'100%', height:'100%', padding:'10px'}}>
              <div className="pro-bar-container" style={{display: showProgress ? 'block' : 'none'}}>
                <div className="pro-bar pro-bar-width" data-pro-bar-percent="100">
                  <div className="pro-bar-candy"></div>
                </div>
              </div>
              <div className='d-flex flew-row justify-content-between'>
                <div style={{lineHeight:'33px'}}ref={this.resultMessageDiv}></div>
                <a style={{ 'float': 'right', marginRight: '10px', display: showClear ? "block" : "none"}}
                  onClick={(e) => this.clearResultsHandler(e, true)}
                  href="#">{this.nls('clear')}</a>
              </div>
              <div className='elocate-list'>
                <List items={this.resultListRecords} removeResultMsg={this.nls('removeresultmessage')}
                  onRecordClick={this.onRecordClick}
                  onRecordRemoveClick={(e) => {this.onRecordRemoveClick(e)}}
                  onRecordMouseOver={this.onRecordMouseOver}
                  onRecordMouseOut={this.onRecordMouseOut}/>
              </div>
            </div>
					</Tab>
          }
				</Tabs>
			</div>
		</div>
	}
}