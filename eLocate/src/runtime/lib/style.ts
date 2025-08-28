import { ThemeVariables, css, SerializedStyles } from 'jimu-core';
import { IMConfig } from '../../config';

export function getStyle(theme: ThemeVariables, widgetConfig: IMConfig): SerializedStyles {

  const root = theme.surfaces[1].bg;

  return css`
    overflow: auto;
    .widget-elocate {
      width: 100%;
      height: 100%;
      background-color: ${root};
    }
    .hintText {
      color: ${theme.colors.palette.light[500]};
      margin-bottom: 0;
    }
    .label {
      display: inline-block;
      width: 110px;
      float: left;
    }
    .esri-icon-cursor {
      display: none;
    }
    .esri-sketch__section:first-child{
      padding: 0;
      margin: 0;
    }
    .pro-bar-container {
      background: #ccc;
      border: 2px solid ${theme.colors.primary};
      height: 1.5em;
      overflow: hidden;
      width: 100%;
    }
    
    .pro-bar {
      background: ${theme.colors.primary};
      height: inherit;
    }
    
    .pro-bar-width{
      /* Here is where you specify the width of ur progress-bar */
      width: 100%;
    }
    
    .pro-bar-candy {
      animation: progress .6s linear infinite;
      /* Don't touch this */
      background: linear-gradient(
        -45deg,
        rgba(255, 255, 255, 0.25) 25%,
        transparent 25%,
        transparent 50%,
        rgba(255, 255, 255, 0.25) 50%,
        rgba(255, 255, 255, 0.25) 75%,
        transparent 75%,
        transparent);
      /* Don't touch this */
      background-repeat: repeat-x;
      /* The size of the bars must match the background-position in the @keyframes */
      background-size: 2em 2em;
      height: inherit;
      width: 100%;
    }
    
    @keyframes progress {
      to { background-position: 2em 0; }
    }

    .search-list-item {
      line-height: 30px;
      font-size: 12px;
      white-space: pre;
      position: relative;
      min-height: 40px;
    }
    
    .search-list-item .rlabel {
      padding-left: 40px;
      padding-right: 22px;
      padding-bottom: 3px;
      cursor: default;
      font-size: 1em;
      margin: 0;
      line-height: 1.5em;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .search-list-item ._title {
      padding-left: 40px;
      padding-right: 22px;
      padding-bottom: 3px;
      margin-right: 22px;
      cursor:default;
      font-weight: bolder;
      font-size: 1em;
      margin: 0;
      line-height: 1.5em;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .search-list-item .labellink{
      padding-left: 40px;
      padding-right: 10px;
      padding-bottom: 3px;
      cursor: pointer;
      outline: none;
    }
    
    .search-list-item .iconDiv {
      position: absolute;
      height: 100%;
      left: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 40px;
    }
    
    .search-list-item .linksdiv {
      text-align: center;
      width: 100%;
      padding-left: 40px;
      padding-right: 5px;
      padding-top: 2px;
      padding-bottom: 5px;
    }
    
    .search-list-item .linkIcon {
      display: inline-block;
      padding-right: 4px;
    }
    
    .search-list-item.alt {
      background-color: #ebebeb;
    }
    
    .search-list-item.selected {
      background-color: #d9dde0;
    }
    
    .search-list-item.selected.alt {
      background-color: #d9dde0;
    }
    
    .search-list-item:hover {
      background-color: #e3eefa;
      box-shadow:inset 0px 0px 0px 1px #89a4c8;
    }
    
    .search-list-item.alt:hover {
      background-color: #e3eefa;
      box-shadow:inset 0px 0px 0px 1px #89a4c8;
    }
    
    .search-list-item.selected:hover {
      background-color: #e3eefa;
      box-shadow:inset 0px 0px 0px 1px #89a4c8;
    }
    
    .search-list-item.selected.alt:hover {
      background-color: #e3eefa;
      box-shadow:inset 0px 0px 0px 1px #89a4c8;
    }
    
    .search-list-item .removediv:before {
      content: '';
      display: inline-block;
      height: 100%;
      vertical-align: middle;
      margin-right: -0.25em;
    }
  
    .search-list-item .removediv {
      text-align: center;
      position: absolute;
      height: 100%;
      width: 22px;
      right: 0;
      padding-top: 4px;
    }

    .search-list-item .linksinnerdiv{
      width: 100%;
      border: thin solid #064B1F;
      border-radius: 4px;
      text-align: center;
      padding-top: 2px;
      background-color: #5A6B4D;
      color: white;
    }
    
    .search-list-item .linkIcon{
      display: inline-block;
      margin: 0 3px;
      cursor: pointer;
    }

    .search-list-item .removedivImg {
      display: inline-block;
      vertical-align: top;
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    .jimu-tab {
      height: 100%;
    }

    .tab-content {
      height: calc(100% - 40px);
    }

    .tab-pane {
      width: 100%;
    }

    .elocate-list {
      overflow: auto;
      margin-top: 5px;
    }

    .search-list-container {
      height: 100%;
    }

    .hideTabs {
      display: none;
    }

    .showTabs {
      display: '';
      height: 100%;
    }

    .resultsMenu {
      cursor: pointer;
    }
  `;
}
