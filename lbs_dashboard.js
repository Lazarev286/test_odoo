odoo.define('lbs_dashboard.lbs_dashboard', function(require) {
    "use strict";

    var core = require('web.core');
    const {patch} = require('web.utils');
    var WebClient = require("web.WebClient");
    var Dialog = require('web.Dialog');
    var viewRegistry = require('web.view_registry');
    var _t = core._t;
    var QWeb = core.qweb;
    var utils = require('web.utils');
    var config = require('web.config');
    var time = require('web.time');
    var datepicker = require("web.datepicker");

    var session = require('web.session');
    var AbstractAction = require('web.AbstractAction');
    var ajax = require('web.ajax');
    var framework = require('web.framework');
    var field_utils = require('web.field_utils');
    var KsGlobalFunction = require('lbs_dashboard.KsGlobalFunction');

    var KsQuickEditView = require('lbs_dashboard.quick_edit_view');



    var KsDashboardNinja = AbstractAction.extend({

        // To show or hide top control panel flag.
        hasControlPanel: false,

        dependencies: ['bus_service'],
        events: {
            'click #lbs_add_item_selection > li': 'onAddItemTypeClick',
            'click .lbs_dashboard_add_layout': '_onKsAddLayoutClick',
            'click .lbs_dashboard_edit_layout': '_onKsEditLayoutClick',
            'click .lbs_dashboard_select_item': 'onKsSelectItemClick',
            'click .lbs_dashboard_save_layout': '_onKsSaveLayoutClick',
            'click .lbs_dashboard_create_new_layout': '_onKsCreateLayoutClick',
            'click .lbs_dashboard_cancel_layout': '_onKsCancelLayoutClick',
            'click .lbs_item_click': '_onKsItemClick',
            'click .lbs_load_previous': 'lbsLoadPreviousRecords',
            'click .lbs_load_next': 'lbsLoadMoreRecords',
            'click .lbs_dashboard_item_customize': '_onKsItemCustomizeClick',
            'click .lbs_dashboard_item_delete': '_onKsDeleteItemClick',
            'change .lbs_dashboard_header_name': '_onKsInputChange',
            'click .lbs_duplicate_item': 'onKsDuplicateItemClick',
            'click .lbs_move_item': 'onKsMoveItemClick',
            'change .lbs_input_import_item_button': 'lbsImportItem',
            'click .lbs_dashboard_menu_container': function(e) {
                e.stopPropagation();
            },
            'click .lbs_qe_dropdown_menu': function(e) {
                e.stopPropagation();
            },
            'click .lbs_chart_json_export': 'lbsItemExportJson',
            'click .lbs_dashboard_item_action': 'lbsStopClickPropagation',
            'show.bs.dropdown .lbs_dropdown_container': 'onKsDashboardMenuContainerShow',
            'hide.bs.dropdown .lbs_dashboard_item_button_container': 'onKsDashboardMenuContainerHide',

            //  Dn Filters Events
            'click .apply-dashboard-date-filter': '_onKsApplyDateFilter',
            'click .clear-dashboard-date-filter': '_onKsClearDateValues',
            'change #lbs_start_date_picker': '_lbsShowApplyClearDateButton',
            'change #lbs_end_date_picker': '_lbsShowApplyClearDateButton',
            'click .lbs_date_filters_menu': '_lbsOnDateFilterMenuSelect',
            'click #lbs_item_info': 'lbsOnListItemInfoClick',
            'click .lbs_chart_color_options': 'lbsRenderChartColorOptions',
            'click #lbs_chart_canvas_id': 'onChartCanvasClick',
            'click .lbs_list_canvas_click': 'onChartCanvasClick',
            'click .lbs_dashboard_item_chart_info': 'onChartMoreInfoClick',
            'click .lbs_chart_xls_csv_export': 'lbsChartExportXlsCsv',
            'click .lbs_chart_pdf_export': 'lbsChartExportPdf',

            'click .lbs_dashboard_quick_edit_action_popup': 'lbsOnQuickEditView',
            'click .lbs_dashboard_item_drill_up': 'lbsOnDrillUp',

            'click .lbs_dashboard_layout_event': '_lbsOnDnLayoutMenuSelect',
            'click .lbs_dashboard_set_current_layout': '_lbsSetCurrentLayoutClick',
            'click .lbs_dashboard_cancel_current_layout': '_lbsSetDiscardCurrentLayoutClick',
            'click .lbs_add_dashboard_item_on_empty' : 'lbs_add_dashboard_item_on_empty',
            'click #dashboard_settings': 'lbsOnDashboardSettingClick',
            'click #dashboard_delete': 'lbsOnDashboardDeleteClick',
            'click #dashboard_create': 'lbsOnDashboardCreateClick',
            'click #dashboard_export': 'lbsOnDashboardExportClick',
            'click #dashboard_import': 'lbsOnDashboardImportClick',
            'click #dashboard_duplicate': 'lbsOnDashboardDuplicateClick',
        },
        /**
         * @override
         */

        jsLibs: [
            '/lbs_dashboard/static/lib/js/Chart.bundle.min.js',
            '/lbs_dashboard/static/lib/js/gridstack-h5.js',
            '/lbs_dashboard/static/lib/js/chartjs-plugin-datalabels.js',
            '/lbs_dashboard/static/lib/js/pdfmake.min.js',
            '/lbs_dashboard/static/lib/js/vfs_fonts.js',
        ],
        cssLibs: ['/lbs_dashboard/static/lib/css/Chart.css',
            '/lbs_dashboard/static/lib/css/Chart.min.css'
        ],

        init: function(parent, state, params) {
//            css_grid = $('.o_rtl').length>0 ?
            this._super.apply(this, arguments);
            this.reload_menu_option = {
                reload: state.context.lbs_reload_menu,
                menu_id: state.context.lbs_menu_id
            };
            this.lbs_mode = 'active';
            this.action_manager = parent;
            this.controllerID = params.controllerID;
            this.name = "lbs_dashboard";
            this.lbsIsDashboardManager = false;
            this.lbsDashboardEditMode = false;
            this.lbsNewDashboardName = false;
            this.file_type_magic_word = {
                '/': 'jpg',
                'R': 'gif',
                'i': 'png',
                'P': 'svg+xml',
            };
            this.lbsAllowItemClick = true;

            //Dn Filters Iitialization
            var l10n = _t.database.parameters;
            this.form_template = 'lbs_dashboard_ninja_template_view';
            this.date_format = time.strftime_to_moment_format(_t.database.parameters.date_format)
            this.date_format = this.date_format.replace(/\bYY\b/g, "YYYY");
            this.datetime_format = time.strftime_to_moment_format((_t.database.parameters.date_format + ' ' + l10n.time_format))
            //            this.is_dateFilter_rendered = false;
            this.lbs_date_filter_data;

            // Adding date filter selection options in dictionary format : {'id':{'days':1,'text':"Text to show"}}
            this.lbs_date_filter_selections = {
                'l_none': _t('Date Filter'),
                'l_day': _t('Today'),
                't_week': _t('This Week'),
                't_month': _t('This Month'),
                't_quarter': _t('This Quarter'),
                't_year': _t('This Year'),
                'n_day': _t('Next Day'),
                'n_week': _t('Next Week'),
                'n_month': _t('Next Month'),
                'n_quarter': _t('Next Quarter'),
                'n_year': _t('Next Year'),
                'ls_day': _t('Last Day'),
                'ls_week': _t('Last Week'),
                'ls_month': _t('Last Month'),
                'ls_quarter': _t('Last Quarter'),
                'ls_year': _t('Last Year'),
                'l_week': _t('Last 7 days'),
                'l_month': _t('Last 30 days'),
                'l_quarter': _t('Last 90 days'),
                'l_year': _t('Last 365 days'),
                'ls_past_until_now': _t('Past Till Now'),
                'ls_pastwithout_now': _t('Past Excluding Today'),
                'n_future_starting_now': _t('Future Starting Now'),
                'n_futurestarting_tomorrow': _t('Future Starting Tomorrow'),
                'l_custom': _t('Custom Filter'),
            };
            // To make sure date filter show date in specific order.
            this.lbs_date_filter_selection_order = ['l_day', 't_week', 't_month', 't_quarter', 't_year', 'n_day',
                'n_week', 'n_month', 'n_quarter', 'n_year', 'ls_day', 'ls_week', 'ls_month', 'ls_quarter',
                'ls_year', 'l_week', 'l_month', 'l_quarter', 'l_year','ls_past_until_now', 'ls_pastwithout_now',
                 'n_future_starting_now', 'n_futurestarting_tomorrow', 'l_custom'
            ];

            this.lbs_dashboard_id = state.params.lbs_dashboard_id;

            this.gridstack_options = {
                staticGrid:true,
                float: false,
                cellHeight: 80,
                styleInHead : true,
                disableOneColumnMode: true,

            };
            if (config.device.isMobileDevice) {
                this.gridstack_options.disableOneColumnMode = false
            }
            this.gridstackConfig = {};
            this.grid = false;
            this.chartMeasure = {};
            this.chart_container = {};
            this.list_container = {};


            this.lbsChartColorOptions = ['default', 'cool', 'warm', 'neon'];
            this.lbsUpdateDashboardItem = this.lbsUpdateDashboardItem.bind(this);


            this.lbsDateFilterSelection = false;
            this.lbsDateFilterStartDate = false;
            this.lbsDateFilterEndDate = false;
            this.lbsUpdateDashboard = {};
            $("head").append('<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">');
            if(state.context.lbs_reload_menu){
                this.trigger_up('reload_menu_data', { keep_open: true, scroll_to_bottom: true});
            }
        },

        getContext: function() {
            var self = this;
            var context = {
                lbsDateFilterSelection: self.lbsDateFilterSelection,
                lbsDateFilterStartDate: self.lbsDateFilterStartDate,
                lbsDateFilterEndDate: self.lbsDateFilterEndDate,
            }
            return Object.assign(context, session.user_context);
        },

        on_attach_callback: function() {
            var self = this;
            $.when(self.lbs_fetch_items_data()).then(function(result){
                self.lbsRenderDashboard();
                self.lbs_set_update_interval();
                if (self.lbs_dashboard_data.lbs_item_data) {
                    self._lbsSaveCurrentLayout();
                }
            });
        },

        lbs_set_update_interval: function() {
            var self = this;
            if (self.lbs_dashboard_data.lbs_item_data) {

                Object.keys(self.lbs_dashboard_data.lbs_item_data).forEach(function(item_id) {
                    var item_data = self.lbs_dashboard_data.lbs_item_data[item_id]
                    var updateValue = item_data["update_items_data"];
                    if (updateValue) {
                        if (!(item_id in self.lbsUpdateDashboard)) {
                            if (['lbs_tile', 'lbs_list_view', 'lbs_kpi', 'lbs_to_do'].indexOf(item_data['dashboard_item_type']) >= 0) {
                                var lbsItemUpdateInterval = setInterval(function() {
                                    self.lbsFetchUpdateItem(item_id)
                                }, updateValue);
                            } else {
                                var lbsItemUpdateInterval = setInterval(function() {
                                    self.lbsFetchChartItem(item_id)
                                }, updateValue);
                            }
                            self.lbsUpdateDashboard[item_id] = lbsItemUpdateInterval;
                        }
                    }
                });
            }
        },


        on_detach_callback: function() {
            var self = this;
            self.lbs_remove_update_interval();
            if (self.lbsDashboardEditMode) self._lbsSaveCurrentLayout();

            self.lbsDateFilterSelection = false;
            self.lbsDateFilterStartDate = false;
            self.lbsDateFilterEndDate = false;
        },

        lbs_remove_update_interval: function() {
            var self = this;
            if (self.lbsUpdateDashboard) {
                Object.values(self.lbsUpdateDashboard).forEach(function(itemInterval) {
                    clearInterval(itemInterval);
                });
                self.lbsUpdateDashboard = {};
            }
        },




        lbsOnDashboardDuplicateClick: function(ev){
            var dashboard_id = this.lbs_dashboard_id;
            var self= this;
            this._rpc({
                model: 'lbs.dashboard_duplicate_wizard',
                method: "DuplicateDashBoard",
                args: [self.lbs_dashboard_id],
                }).then((result)=>{
                    self.do_action(result)
                });
        },

        lbsOnDashboardImportClick: function(ev){
            var self = this;
            var dashboard_id = this.lbs_dashboard_id;
            this._rpc({
                    model: 'lbs.dashboard',
                    method: 'lbs_open_import',
                    args: [dashboard_id],
                    kwargs: {
                        dashboard_id: dashboard_id
                    }
                    }).then((result)=>{
                    self.do_action(result)
                    });
        },

        lbsOnDashboardExportClick: function(ev){
           var self= this;
           var dashboard_id = JSON.stringify(this.lbs_dashboard_id);
                this._rpc({
                model: 'lbs.dashboard',
                method: "lbs_dashboard_export",
                args: [dashboard_id],
                kwargs: {
                        dashboard_id: dashboard_id
                    }
            }).then(function(result) {
                var name = "dashboard_ninja";
                var data = {
                    "header": name,
                    "dashboard_data": result,
                }
                framework.blockUI();
                self.getSession().get_file({
                    url: '/lbs_dashboard/export/dashboard_json',
                    data: {
                        data: JSON.stringify(data)
                    },
                    complete: framework.unblockUI,
                    error: (error) => this.call('crash_manager', 'rpc_error', error),
                });
            })
        },

        lbsOnDashboardSettingClick: function(ev){
            var self = this;
            var dashboard_id = this.lbs_dashboard_id;
            this._rpc({
                    model: 'lbs.dashboard',
                    method: 'lbs_open_setting',
                    args: [dashboard_id],
                    kwargs: {
                        dashboard_id: dashboard_id
                    }
                    }).then((result)=>{
                    self.do_action(result)
                    });
        },

        lbsOnDashboardDeleteClick: function(ev){
           var dashboard_id = this.lbs_dashboard_id;
           var self= this;
                this._rpc({
                model: 'lbs.dashboard_delete_wizard',
                method: "DeleteDashBoard",
                args: [self.lbs_dashboard_id],
            }).then((result)=>{
                    self.do_action(result);
              });
        },

        lbsOnDashboardCreateClick: function(ev){
           var self= this;
//                this._rpc({
//                model: 'ks.dashboard.wizard',
//                method: "CreateDashBoard",
//                args: [''],
//            }).then((result)=>{
//                self.do_action(result);
//              });
           var action = {
                name: _t('Create Dashboard'),
                type: 'ir.actions.act_window',
                res_model: 'lbs.dashboard_wizard',
                domain: [],
                context: {
                },
                views: [
                    [false, 'form']
                ],
                view_mode: 'form',
                target: 'new',
           }
           self.do_action(action)

        },


        _lbsOnDnLayoutMenuSelect: function(ev){
            var selected_layout_id = $(ev.currentTarget).data('lbs_layout_id');
            this.lbsOnLayoutSelection(selected_layout_id);

        },

        lbsOnLayoutSelection: function(layout_id){
            var self = this;
            var selected_layout_name = this.lbs_dashboard_data.lbs_child_boards[layout_id][0];
            var selected_layout_grid_config = this.lbs_dashboard_data.lbs_child_boards[layout_id][1];
            this.gridstackConfig = JSON.parse(selected_layout_grid_config);
            _(this.gridstackConfig).each((x,y)=>{
                self.grid.update(self.$el.find(".grid-stack-item[gs-id=" + y + "]")[0],{ x:x['x'], y:x['y'], w:x['w'], h:x['h'],autoPosition:false});
            });
            self.grid.commit();
            this.$el.find("#lbs_dashboard_layout_dropdown_container .lbs_layout_selected").removeClass("lbs_layout_selected");
            this.$el.find("li.lbs_dashboard_layout_event[data-lbs_layout_id='"+ layout_id + "']").addClass('lbs_layout_selected');
            this.$el.find("#lbs_dn_layout_button span:first-child").text(selected_layout_name);

            this.$el.find(".lbs_dashboard_top_menu .lbs_dashboard_top_settings").addClass("lbs_hide");
            this.$el.find(".lbs_dashboard_top_menu .lbs_am_content_element").addClass("lbs_hide");
            this.$el.find(".lbs_dashboard_layout_edit_mode_settings").removeClass("lbs_hide");
        },

        _lbsSetCurrentLayoutClick: function(){
            var self = this;
            this.lbs_dashboard_data.lbs_selected_board_id = this.$el.find("#lbs_dashboard_layout_dropdown_container .lbs_layout_selected").data('lbs_layout_id');
            this.$el.find(".lbs_dashboard_top_menu .lbs_dashboard_top_settings").removeClass("lbs_hide");
            this.$el.find(".lbs_dashboard_top_menu .lbs_am_content_element").removeClass("lbs_hide");
            this.$el.find(".lbs_dashboard_layout_edit_mode_settings").addClass("lbs_hide");
            this.lbs_dashboard_data.name = this.lbs_dashboard_data.lbs_child_boards[this.lbs_dashboard_data.lbs_selected_board_id][0];

            this._rpc({
                model: 'lbs.dashboard',
                method: 'update_child_board',
                args: ['update', self.lbs_dashboard_id, {
                    "lbs_selected_board_id": this.lbs_dashboard_data.lbs_selected_board_id,
                }],
            });
        },

        _lbsSetDiscardCurrentLayoutClick: function(){
            this.lbsOnLayoutSelection(this.lbs_dashboard_data.lbs_selected_board_id);
            this.$el.find(".lbs_dashboard_top_menu .lbs_dashboard_top_settings").removeClass("lbs_hide");
            this.$el.find(".lbs_dashboard_top_menu .lbs_am_content_element").removeClass("lbs_hide");
            this.$el.find(".lbs_dashboard_layout_edit_mode_settings").addClass("lbs_hide");

        },


        lbsOnQuickEditView: function(e) {
            var self = this;
            var item_id = e.currentTarget.dataset.itemId;
            var item_data = this.lbs_dashboard_data.lbs_item_data[item_id];
            var item_el = $.find('[gs-id=' + item_id + ']');
            var $quickEditButton = $(QWeb.render('lbsQuickEditButtonContainer', {
                grid: $.extend({}, item_el[0].gridstackNode)
            }));
            $(item_el).before($quickEditButton);

            var lbsQuickEditViewWidget = new KsQuickEditView.QuickEditView(this, {
                item: item_data,
            });

            lbsQuickEditViewWidget.appendTo($quickEditButton.find('.dropdown-menu'));

            lbsQuickEditViewWidget.on("canBeDestroyed", this, function(result) {
                if (lbsQuickEditViewWidget) {
                    lbsQuickEditViewWidget = false;
                    $quickEditButton.find('.lbs_dashboard_item_action').click();
                }
            });

            lbsQuickEditViewWidget.on("canBeRendered", this, function(result) {
                $quickEditButton.find('.lbs_dashboard_item_action').click();
            });

            lbsQuickEditViewWidget.on("openFullItemForm", this, function(result) {
                lbsQuickEditViewWidget.destroy();
                $quickEditButton.find('.lbs_dashboard_item_action').click();
                self.lbs_open_item_form_page(parseInt(item_id));
            });


            $quickEditButton.on("hide.bs.dropdown", function(ev) {
                if (ev.hasOwnProperty("clickEvent") && document.contains(ev.clickEvent.target)) {
                    if (lbsQuickEditViewWidget) {
                        lbsQuickEditViewWidget.lbsDiscardChanges();
                        lbsQuickEditViewWidget = false;
                        self.lbs_set_update_interval();
                        $quickEditButton.remove();
                    } else {
                        self.lbs_set_update_interval();
                        $quickEditButton.remove();
                    }
                } else if (!ev.hasOwnProperty("clickEvent")) {
                    self.lbs_set_update_interval();
                    $quickEditButton.remove();
                } else {
                    return false;
                }
            });

            $quickEditButton.on("show.bs.dropdown", function() {
                self.lbs_remove_update_interval();
            });

            e.stopPropagation();
        },

        willStart: function() {
            var self = this;
            var def;
            if (this.reload_menu_option.reload && this.reload_menu_option.menu_id) {
                def = this.getParent().actionService.lbsDnReloadMenu(this.reload_menu_option.menu_id);
            }
            return $.when(def, ajax.loadLibs(this), this._super()).then(function() {
                return self.lbs_fetch_data();
            });
        },

        start: function() {
            var self = this;
            self.lbs_set_default_chart_view();
            return this._super().then(function(){
                self.call('bus_service', 'onNotification', self, function (notifications) {
                    _.each(notifications, (function (notification) {
                        if (notification.hasOwnProperty('type') && notification['type'].type === "lbs_dashboard.notification" && self.lbs_mode ==='active') {
                            var item_to_update = _(notification.type.changes).filter((x)=>{return self.lbs_dashboard_data.dashboard_items_ids.indexOf(x)>=0});
                            if(item_to_update){

                                var msg = "" + item_to_update.length + " Dashboard item has been updated."
                                if (item_to_update.length >1){
                                    msg = "" + item_to_update.length + " Dashboard items has been updated."
                                }

                                var update_notification_ids = _(item_to_update).filter((x)=>{return self.lbs_dashboard_data.lbs_item_data[x].auto_update_type === 'lbs_live_update' && self.lbs_dashboard_data.lbs_item_data[x].show_live_pop_up === true});
                                if(update_notification_ids.length>0){

                                        self.call('notification', 'notify', {
                                            message: msg,
                                            type: 'info',
                                        });
                                }
                                for(var i = 0; i < update_notification_ids.length; i++){

                                    self.lbsFetchUpdateItem(update_notification_ids[i])
                                }
                            }
                        }
                    }).bind(this));
                });
            });
        },

        lbs_set_default_chart_view: function() {
            Chart.plugins.unregister(ChartDataLabels);
            var backgroundColor = 'white';
            Chart.plugins.register({
                beforeDraw: function(c) {
                    var ctx = c.chart.ctx;
                    ctx.fillStyle = backgroundColor;
                    ctx.fillRect(0, 0, c.chart.width, c.chart.height);
                }
            });
            Chart.plugins.register({
                afterDraw: function(chart) {
                    if (chart.data.labels.length === 0) {
                        // No data is present
                        var ctx = chart.chart.ctx;
                        var width = chart.chart.width;
                        var height = chart.chart.height
                        chart.clear();

                        ctx.save();
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.font = "3rem 'Lucida Grande'";
                        ctx.fillText('No data available', width / 2, height / 2);
                        ctx.restore();
                    }
                }

            });

            Chart.Legend.prototype.afterFit = function() {
                var chart_type = this.chart.config.type;
                if (chart_type === "pie" || chart_type === "doughnut") {
                    this.height = this.height;
                } else {
                    this.height = this.height + 20;
                };
            };
        },

        lbsFetchUpdateItem: function(item_id) {
            var self = this;
            return self._rpc({
                model: 'lbs.dashboard',
                method: 'lbs_fetch_item',
                args: [
                    [parseInt(item_id)], self.lbs_dashboard_id, self.lbsGetParamsForItemFetch(parseInt(item_id))
                ],
                context: self.getContext(),
            }).then(function(new_item_data) {
                this.lbs_dashboard_data.lbs_item_data[item_id] = new_item_data[item_id];
                this.lbsUpdateDashboardItem([item_id]);
            }.bind(this));
        },

        lbsRenderChartColorOptions: function(e) {
            var self = this;
            if (!$(e.currentTarget).parent().hasClass('lbs_date_filter_selected')) {
                //            FIXME : Correct this later.
                var $parent = $(e.currentTarget).parent().parent();
                $parent.find('.lbs_date_filter_selected').removeClass('lbs_date_filter_selected')
                $(e.currentTarget).parent().addClass('lbs_date_filter_selected')
                var item_data = self.lbs_dashboard_data.lbs_item_data[$parent.data().itemId];
                var chart_data = JSON.parse(item_data.lbs_chart_data);
                this.lbsChartColors(e.currentTarget.dataset.chartColor, this.chart_container[$parent.data().itemId], $parent.data().chartType, $parent.data().chartFamily, item_data.lbs_bar_chart_stacked, item_data.semi_circle_chart, item_data.lbs_show_data_value, chart_data, item_data)
                this._rpc({
                    model: 'lbs.dashboard_items',
                    method: 'write',
                    args: [$parent.data().itemId, {
                        "chart_item_color": e.currentTarget.dataset.chartColor
                    }],
                }).then(function() {
                    self.lbs_dashboard_data.lbs_item_data[$parent.data().itemId]['chart_item_color'] = e.currentTarget.dataset.chartColor;
                });
            }
        },

        //To fetch dashboard data.
        lbs_fetch_data: function() {
            var self = this;
            return this._rpc({
                model: 'lbs.dashboard',
                method: 'lbs_fetch_dashboard_data',
                args: [self.lbs_dashboard_id],
                context: self.getContext(),
            }).then(function(result) {
//                result = self.normalize_dn_data(result);
                self.lbs_dashboard_data = result;
            });
        },

        normalize_dn_data: function(result){
            _(result.lbs_child_boards).each((x,y)=>{if (typeof(y)==='number'){
                result[y.toString()] = result[y];
                delete result[y];
            }})
            return result;
        },

        lbs_fetch_items_data: function(){
            var self = this;
            var items_promises = []
            self.lbs_dashboard_data.dashboard_items_ids.forEach(function(item_id){
                items_promises.push(self._rpc({
                    model: "lbs.dashboard",
                    method: "lbs_fetch_item",
                    context: self.getContext(),
                    args : [[item_id], self.lbs_dashboard_id, self.lbsGetParamsForItemFetch(item_id)]
                }).then(function(result){
                    self.lbs_dashboard_data.lbs_item_data[item_id] = result[item_id];
                }));
            });

            return Promise.all(items_promises)
        },

        lbsGetParamsForItemFetch: function(){
            return {};
        },

        on_reverse_breadcrumb: function(state) {
            var self = this;
            self.trigger_up('push_state', {
                controllerID: this.controllerID,
                state: state || {},
            });
            return $.when(self.lbs_fetch_data());
        },

        lbsStopClickPropagation: function(e) {
            this.lbsAllowItemClick = false;
        },

        onKsDashboardMenuContainerShow: function(e) {
            $(e.currentTarget).addClass('lbs_dashboard_item_menu_show');
            var item_id = e.currentTarget.dataset.item_id;
            if (this.lbsUpdateDashboard[item_id]){
                clearInterval(this.lbsUpdateDashboard[item_id]);
                delete this.lbsUpdateDashboard[item_id]
            }

            //            Dynamic Bootstrap menu populate Image Report
            if ($(e.target).hasClass('lbs_dashboard_more_action')) {
                var chart_id = e.target.dataset.itemId;
                var name = this.lbs_dashboard_data.lbs_item_data[chart_id].name;
                var base64_image = this.chart_container[chart_id].toBase64Image();
                $(e.target).find('.dropdown-menu').empty();
                $(e.target).find('.dropdown-menu').append($(QWeb.render('lbsMoreChartOptions', {
                    href: base64_image,
                    download_fileName: name,
                    chart_id: chart_id
                })))
            }
        },

        onKsDashboardMenuContainerHide: function(e) {
            var self = this;
            $(e.currentTarget).removeClass('lbs_dashboard_item_menu_show');
            var item_id = e.currentTarget.dataset.item_id;
            var updateValue = this.lbs_dashboard_data.lbs_item_data[item_id]["update_items_data"];
            if (updateValue) {
                var updateinterval = setInterval(function() {
                    self.lbsFetchUpdateItem(item_id)
                }, updateValue);
                self.lbsUpdateDashboard[item_id] = updateinterval;
            }
            if (this.lbs_dashboard_data.lbs_item_data[item_id]['isDrill'] == true) {
                clearInterval(this.lbsUpdateDashboard[item_id]);
            }
        },

        lbs_get_dark_color: function(color, opacity, percent) {
            var num = parseInt(color.slice(1), 16),
                amt = Math.round(2.55 * percent),
                R = (num >> 16) + amt,
                G = (num >> 8 & 0x00FF) + amt,
                B = (num & 0x0000FF) + amt;
            return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1) + "," + opacity;
        },


        //    This is to convert color #value into RGB format to add opacity value.
        _lbs_get_rgba_format: function(val) {
            var rgba = val.split(',')[0].match(/[A-Za-z0-9]{2}/g);
            rgba = rgba.map(function(v) {
                return parseInt(v, 16)
            }).join(",");
            return "rgba(" + rgba + "," + val.split(',')[1] + ")";
        },

        lbsRenderDashboard: function() {
            var self = this;
            self.$el.empty();
            self.$el.addClass('lbs_dashboard d-flex flex-column');

            var dash_name = $('ul[id="lbs_dashboard_layout_dropdown_container"] li[class="lbs_dashboard_layout_event lbs_layout_selected"] span').text()
            if (self.lbs_dashboard_data.lbs_child_boards) self.lbs_dashboard_data.name = this.lbs_dashboard_data.lbs_child_boards[self.lbs_dashboard_data.lbs_selected_board_id][0];
            var $lbs_header = $(QWeb.render('lbsDashboardBoardHeader', {
                lbs_dashboard_name: self.lbs_dashboard_data.name,
                lbs_multi_layout: self.lbs_dashboard_data.multi_layouts,
                lbs_dash_name: self.lbs_dashboard_data.name,
                lbs_dashboard_manager: self.lbs_dashboard_data.lbs_dashboard_manager,
                date_selection_data: self.lbs_date_filter_selections,
                date_selection_order: self.lbs_date_filter_selection_order,
                lbs_show_create_layout_option: (Object.keys(self.lbs_dashboard_data.lbs_item_data).length > 0) && self.lbs_dashboard_data.lbs_dashboard_manager,
                lbs_show_layout: self.lbs_dashboard_data.lbs_dashboard_manager && self.lbs_dashboard_data.lbs_child_boards && true,
                lbs_selected_board_id: self.lbs_dashboard_data.lbs_selected_board_id,
                lbs_child_boards: self.lbs_dashboard_data.lbs_child_boards,
                lbs_dashboard_data: self.lbs_dashboard_data,
                lbs_dn_pre_defined_filters: _(self.lbs_dashboard_data.lbs_dashboard_pre_domain_filter).values().sort(function(a, b){return a.sequence - b.sequence}),
            }));

            if (!config.device.isMobile) {
                $lbs_header.addClass("lbs_dashboard_header_sticky")
            }

            self.$el.append($lbs_header);
            if (Object.keys(self.lbs_dashboard_data.lbs_item_data).length===0){
                self.$el.find('.lbs_dashboard_link').addClass("d-none");
                self.$el.find('.lbs_dashboard_edit_layout').addClass("d-none");
            }
            self.lbsRenderDashboardMainContent();
            if (Object.keys(self.lbs_dashboard_data.lbs_item_data).length === 0) {
                self._lbsRenderNoItemView();
            }
        },

        lbsRenderDashboardMainContent: function() {
            var self = this;
            if (self.lbs_dashboard_data.lbs_item_data) {
                self._renderDateFilterDatePicker();

                self.$el.find('.lbs_dashboard_link').removeClass("lbs_hide");

                $('.lbs_dashboard_items_list').remove();
                var $dashboard_body_container = $(QWeb.render('lbs_main_body_container'))
                var $gridstackContainer = $dashboard_body_container.find(".grid-stack");
                $dashboard_body_container.appendTo(self.$el)
                self.grid = GridStack.init(self.gridstack_options,$gridstackContainer[0]);

                var items = self.lbsSortItems(self.lbs_dashboard_data.lbs_item_data);

                self.lbsRenderDashboardItems(items);

                // In gridstack version 0.3 we have to make static after adding element in dom
                self.grid.setStatic(true);

            } else if (!self.lbs_dashboard_data.lbs_item_data) {
                self.$el.find('.lbs_dashboard_link').addClass("lbs_hide");
                self._lbsRenderNoItemView();
            }
        },

        // This function is for maintaining the order of items in mobile view
        lbsSortItems: function(lbs_item_data) {
            var items = []
            var self = this;
            var item_data = Object.assign({}, lbs_item_data);
            if (self.lbs_dashboard_data.gridstack_config) {
                self.gridstackConfig = JSON.parse(self.lbs_dashboard_data.gridstack_config);
                var a = Object.values(self.gridstackConfig);
                var b = Object.keys(self.gridstackConfig);
                for (var i = 0; i < a.length; i++) {
                    a[i]['id'] = b[i];
                }
                a.sort(function(a, b) {
                    return (35 * a.y + a.x) - (35 * b.y + b.x);
                });
                for (var i = 0; i < a.length; i++) {
                    if (item_data[a[i]['id']]) {
                        items.push(item_data[a[i]['id']]);
                        delete item_data[a[i]['id']];
                    }
                }
            }

            return items.concat(Object.values(item_data));
        },

        lbsRenderDashboardItems: function(items) {
            var self = this;
            self.$el.find('.print-dashboard-btn').addClass("lbs_pro_print_hide");

            if (self.lbs_dashboard_data.gridstack_config) {
                self.gridstackConfig = JSON.parse(self.lbs_dashboard_data.gridstack_config);
            }
            var item_view;
            var lbs_container_class = 'grid-stack-item',
                lbs_inner_container_class = 'grid-stack-item-content';
                for (var i = 0; i < items.length; i++) {
                if (self.grid) {

                    if (items[i].dashboard_item_type === 'lbs_tile') {
                        var item_view = self._lbsRenderDashboardTile(items[i])
                        if (items[i].id in self.gridstackConfig) {
//                            self.grid.addWidget($(item_view), self.gridstackConfig[items[i].id].x, self.gridstackConfig[items[i].id].y, self.gridstackConfig[items[i].id].width, self.gridstackConfig[items[i].id].height, false, 6, null, 2, 2, items[i].id);
                             self.grid.addWidget($(item_view)[0], {x:self.gridstackConfig[items[i].id].x, y:self.gridstackConfig[items[i].id].y, w:self.gridstackConfig[items[i].id].w, h:self.gridstackConfig[items[i].id].h,autoPosition:true,minW:2,maxW:null,minH:2,maxH:null,id:items[i].id});
                        } else {
                             self.grid.addWidget($(item_view)[0], {x:0, y:0, w:4, h:2,autoPosition:true,minW:2,maxW:null,minH:2,maxH:2,id:items[i].id});
                        }
                    } else if (items[i].dashboard_item_type === 'lbs_list_view') {
                        self._renderListView(items[i], self.grid)
                    }else if (items[i].dashboard_item_type === 'lbs_kpi') {
                        var kpi_preview = self.renderKpi(items[i], self.grid)
                        if (items[i].id in self.gridstackConfig) {
                            self.grid.addWidget($kpi_preview[0], {x:self.gridstackConfig[items[i].id].x, y:self.gridstackConfig[items[i].id].y, w:self.gridstackConfig[items[i].id].w, h:self.gridstackConfig[items[i].id].h,autoPosition:true,minW:2,maxW:null,minH:2,maxH:null,id:items[i].id});
                        } else {
                             self.grid.addWidget($kpi_preview[0], {x:0, y:0, w:3, h:2,autoPosition:true,minW:2,maxW:null,minH:2,maxH:null,id:items[i].id});
                        }

                    }else {
                        self._renderGraph(items[i], self.grid)
                    }
                }
            }
        },

        _lbsRenderDashboardTile: function(tile) {
            var self = this;
            var lbs_container_class = 'grid-stack-item';
            var lbs_inner_container_class = 'grid-stack-item-content';
            var lbs_icon_url, item_view;
            var lbs_rgba_background_color, lbs_rgba_font_color, lbs_rgba_default_icon_color,lbs_rgba_button_color;
            var style_main_body, style_image_body_l2, style_domain_count_body, style_button_customize_body,
                style_button_delete_body;


            if (tile.lbs_multiplier_active){
                var lbs_record_count = tile.lbs_record_count * tile.lbs_multiplier
                var data_count = KsGlobalFunction._onKsGlobalFormatter(lbs_record_count, tile.data_formatting, tile.lbs_precision_digits);
                var count = lbs_record_count;
            }else{
                 var data_count = KsGlobalFunction._onKsGlobalFormatter(tile.lbs_record_count, tile.data_formatting, tile.lbs_precision_digits);
                 var count = lbs_record_count
            }
            if (tile.icon_select == "Custom") {
                if (tile.lbs_icon[0]) {
                    lbs_icon_url = 'data:image/' + (self.file_type_magic_word[tile.lbs_icon[0]] || 'png') + ';base64,' + tile.lbs_icon;
                } else {
                    lbs_icon_url = false;
                }
            }


            tile.lbsIsDashboardManager = self.lbs_dashboard_data.lbs_dashboard_manager;
            lbs_rgba_background_color = self._lbs_get_rgba_format(tile.background_color);
            lbs_rgba_font_color = self._lbs_get_rgba_format(tile.lbs_font_color);
            lbs_rgba_default_icon_color = self._lbs_get_rgba_format(tile.default_icon_color);
            lbs_rgba_button_color = self._lbs_get_rgba_format(tile.lbs_button_color);
            style_main_body = "background-color:" + lbs_rgba_background_color + ";color : " + lbs_rgba_font_color + ";";
            switch (tile.lbs_layout) {
                case 'layout1':
                    item_view = QWeb.render('lbs_dashboard_item_layout1', {
                        item: tile,
                        style_main_body: style_main_body,
                        lbs_icon_url: lbs_icon_url,
                        lbs_rgba_default_icon_color: lbs_rgba_default_icon_color,
                        lbs_rgba_button_color:lbs_rgba_button_color,
                        lbs_container_class: lbs_container_class,
                        lbs_inner_container_class: lbs_inner_container_class,
                        lbs_dashboard_list: self.lbs_dashboard_data.lbs_dashboard_list,
                        data_count: data_count,
                        count: count
                    });
                    break;

                case 'layout2':
                    var lbs_rgba_dark_background_color_l2 = self._lbs_get_rgba_format(self.lbs_get_dark_color(tile.background_color.split(',')[0], tile.background_color.split(',')[1], -10));
                    style_image_body_l2 = "background-color:" + lbs_rgba_dark_background_color_l2 + ";";
                    item_view = QWeb.render('lbs_dashboard_item_layout2', {
                        item: tile,
                        style_image_body_l2: style_image_body_l2,
                        style_main_body: style_main_body,
                        lbs_icon_url: lbs_icon_url,
                        lbs_rgba_default_icon_color: lbs_rgba_default_icon_color,
                        lbs_rgba_button_color:lbs_rgba_button_color,
                        lbs_container_class: lbs_container_class,
                        lbs_inner_container_class: lbs_inner_container_class,
                        lbs_dashboard_list: self.lbs_dashboard_data.lbs_dashboard_list,
                        data_count: data_count,
                        count: count

                    });
                    break;

                case 'layout3':
                    item_view = QWeb.render('lbs_dashboard_item_layout3', {
                        item: tile,
                        style_main_body: style_main_body,
                        lbs_icon_url: lbs_icon_url,
                        lbs_rgba_default_icon_color: lbs_rgba_default_icon_color,
                        lbs_rgba_button_color:lbs_rgba_button_color,
                        lbs_container_class: lbs_container_class,
                        lbs_inner_container_class: lbs_inner_container_class,
                        lbs_dashboard_list: self.lbs_dashboard_data.lbs_dashboard_list,
                        data_count: data_count,
                        count: count

                    });
                    break;

                case 'layout4':
                    style_main_body = "color : " + lbs_rgba_font_color + ";border : solid;border-width : 1px;border-color:" + lbs_rgba_background_color + ";"
                    style_image_body_l2 = "background-color:" + lbs_rgba_background_color + ";";
                    style_domain_count_body = "color:" + lbs_rgba_background_color + ";";
                    item_view = QWeb.render('lbs_dashboard_item_layout4', {
                        item: tile,
                        style_main_body: style_main_body,
                        style_image_body_l2: style_image_body_l2,
                        style_domain_count_body: style_domain_count_body,
                        lbs_icon_url: lbs_icon_url,
                        lbs_rgba_default_icon_color: lbs_rgba_default_icon_color,
                        lbs_rgba_button_color:lbs_rgba_button_color,
                        lbs_container_class: lbs_container_class,
                        lbs_inner_container_class: lbs_inner_container_class,
                        lbs_dashboard_list: self.lbs_dashboard_data.lbs_dashboard_list,
                        data_count: data_count,
                        count: count

                    });
                    break;

                case 'layout5':
                    item_view = QWeb.render('lbs_dashboard_item_layout5', {
                        item: tile,
                        style_main_body: style_main_body,
                        lbs_icon_url: lbs_icon_url,
                        lbs_rgba_default_icon_color: lbs_rgba_default_icon_color,
                        lbs_rgba_button_color:lbs_rgba_button_color,
                        lbs_container_class: lbs_container_class,
                        lbs_inner_container_class: lbs_inner_container_class,
                        lbs_dashboard_list: self.lbs_dashboard_data.lbs_dashboard_list,
                        data_count: data_count,
                        count: count

                    });
                    break;

                case 'layout6':
                    lbs_rgba_default_icon_color = self._lbs_get_rgba_format(tile.default_icon_color);
                    item_view = QWeb.render('lbs_dashboard_item_layout6', {
                        item: tile,
                        style_image_body_l2: style_image_body_l2,
                        style_main_body: style_main_body,
                        lbs_icon_url: lbs_icon_url,
                        lbs_rgba_default_icon_color: lbs_rgba_default_icon_color,
                        lbs_rgba_button_color:lbs_rgba_button_color,
                        lbs_container_class: lbs_container_class,
                        lbs_inner_container_class: lbs_inner_container_class,
                        lbs_dashboard_list: self.lbs_dashboard_data.lbs_dashboard_list,
                        data_count: data_count,
                        count: count

                    });
                    break;

                default:
                    item_view = QWeb.render('lbs_dashboard_item_layout_default', {
                        item: tile
                    });
                    break;
            }


            return item_view
        },

        _renderGraph: function(item) {
            var self = this;
            var chart_data = JSON.parse(item.lbs_chart_data);
            var isDrill = item.isDrill ? item.isDrill : false;
            var chart_id = item.id,
                chart_title = item.name;
            var chart_title = item.name;
            var chart_type = item.dashboard_item_type.split('_')[1];
            switch (chart_type) {
                case "pie":
                case "doughnut":
                case "polarArea":
                    var chart_family = "circle";
                    break;
                case "bar":
                case "horizontalBar":
                case "line":
                case "area":
                    var chart_family = "square"
                    break;
                default:
                    var chart_family = "none";
                    break;

            }

            var $lbs_gridstack_container = $(QWeb.render('lbs_gridstack_container', {
                lbs_chart_title: chart_title,
                lbsIsDashboardManager: self.lbs_dashboard_data.lbs_dashboard_manager,
                lbs_dashboard_list: self.lbs_dashboard_data.lbs_dashboard_list,
                chart_id: chart_id,
                chart_family: chart_family,
                chart_type: chart_type,
                lbsChartColorOptions: this.lbsChartColorOptions,
            })).addClass('lbs_dashboarditem_id');
            $lbs_gridstack_container.find('.lbs_li_' + item.chart_item_color).addClass('lbs_date_filter_selected');

            var lbsLayoutGridId = $(self.$el[0]).find('.lbs_layout_selected').attr('data-lbs_layout_id')
            if(lbsLayoutGridId && lbsLayoutGridId != 'lbs_default'){
                self.gridstackConfig = JSON.parse(self.lbs_dashboard_data.lbs_child_boards[parseInt(lbsLayoutGridId)][1])
            }
            parseInt($(self.$el[0]).find('.lbs_layout_selected').attr('data-lbs_layout_id'))
            if (chart_id in self.gridstackConfig) {
                  self.grid.addWidget($lbs_gridstack_container[0], {x:self.gridstackConfig[chart_id].x, y:self.gridstackConfig[chart_id].y, w:self.gridstackConfig[chart_id].w, h:self.gridstackConfig[chart_id].h, autoPosition:false,minW:4,maxW:null,minH:3,maxH:null,id :chart_id});
            } else {
                  self.grid.addWidget($lbs_gridstack_container[0], {x:0, y:0, w:5, h:4,autoPosition:true,minW:4,maxW:null,minH:3,maxH:null, id :chart_id});
            }
            self._renderChart($lbs_gridstack_container, item);
        },

        _renderChart: function($lbs_gridstack_container, item) {
            var self = this;
            var chart_data = JSON.parse(item.lbs_chart_data);

            if (item.chart_cumulative_field){

                for (var i=0; i< chart_data.datasets.length; i++){
                    var lbs_temp_com = 0
                    var data = []
                    var datasets = {}
                    if (chart_data.datasets[i].chart_cumulative_field){
                        for (var j=0; j < chart_data.datasets[i].data.length; j++)
                            {
                                lbs_temp_com = lbs_temp_com + chart_data.datasets[i].data[j];
                                data.push(lbs_temp_com);
                            }
                            datasets.label =  'Cumulative' + chart_data.datasets[i].label;
                            datasets.data = data;
                            if (item.lbs_chart_cumulative){
                                datasets.type =  'line';
                            }
                            chart_data.datasets.push(datasets);
                    }
                }
            }
            var isDrill = item.isDrill ? item.isDrill : false;
            var chart_id = item.id,
                chart_title = item.name;
            var chart_title = item.name;
            var chart_type = item.dashboard_item_type.split('_')[1];
            switch (chart_type) {
                case "pie":
                case "doughnut":
                case "polarArea":
                    var chart_family = "circle";
                    break;
                case "bar":
                case "horizontalBar":
                case "line":
                case "area":
                    var chart_family = "square"
                    break;
                default:
                    var chart_family = "none";
                    break;

            }
            $lbs_gridstack_container.find('.lbs_color_pallate').data({
                chartType: chart_type,
                chartFamily: chart_family
            }); {
                chartType: "pie"
            }
            var $lbsChartContainer = $('<canvas id="lbs_chart_canvas_id" data-chart-id=' + chart_id + '/>');
            $lbs_gridstack_container.find('.card-body').append($lbsChartContainer);
            if (!item.lbs_show_records) {
                $lbs_gridstack_container.find('.lbs_dashboard_item_chart_info').hide();
            }
            item.$el = $lbs_gridstack_container;
            if (chart_family === "circle") {
                if (chart_data && chart_data['labels'].length > 30) {
                    $lbs_gridstack_container.find(".lbs_dashboard_color_option").remove();
                    $lbs_gridstack_container.find(".card-body").empty().append($("<div style='font-size:20px;'>Too many records for selected Chart Type. Consider using <strong>Domain</strong> to filter records or <strong>Record Limit</strong> to limit the no of records under <strong>30.</strong>"));
                    return;
                }
            }

            if (chart_data["lbs_show_second_y_scale"] && item.dashboard_item_type === 'lbs_bar_chart') {
                var scales = {}
                scales.yAxes = [{
                        type: "linear",
                        display: true,
                        position: "left",
                        id: "y-axis-0",
                        gridLines: {
                            display: true
                        },
                        labels: {
                            show: true,
                        }
                    },
                    {
                        type: "linear",
                        display: true,
                        position: "right",
                        id: "y-axis-1",
                        labels: {
                            show: true,
                        },
                        ticks: {
                            beginAtZero: true,
                            callback: function(value, index, values) {
                                var lbs_selection = chart_data.lbs_selection;
                                if (lbs_selection === 'monetary') {
                                    var lbs_currency_id = chart_data.lbs_currency;
                                    var lbs_data = value;
                                    lbs_data = KsGlobalFunction._onKsGlobalFormatter(lbs_data, item.data_formatting, item.lbs_precision_digits);
                                    lbs_data = KsGlobalFunction.lbs_monetary(lbs_data, lbs_currency_id);
                                   return lbs_data;
                                } else if (lbs_selection === 'custom') {
                                    var lbs_field = chart_data.lbs_field;
                                    return KsGlobalFunction._onKsGlobalFormatter(value, item.data_formatting, item.lbs_precision_digits) + ' ' + lbs_field;

                                } else {
                                   return KsGlobalFunction._onKsGlobalFormatter(value, item.data_formatting, item.lbs_precision_digits);
                                }
                            },
                        }
                    }
                ]
            }
            var chart_plugin = [];
            if (item.lbs_show_data_value) {
                chart_plugin.push(ChartDataLabels);
            }
            var lbsMyChart = new Chart($lbsChartContainer[0], {
                type: chart_type === "area" ? "line" : chart_type,
                plugins: chart_plugin,
                data: {
                    labels: chart_data['labels'],
                    groupByIds: chart_data['groupByIds'],
                    domains: chart_data['domains'],
                    datasets: chart_data.datasets,
                },
                options: {
                    maintainAspectRatio: false,
                    responsiveAnimationDuration: 1000,
                    animation: {
                        easing: 'easeInQuad',
                    },
                   legend: {
                            display: item.lbs_hide_legend
                        },
                    scales: scales,
                   layout: {
                        padding: {
                        bottom: 0,
                   }
                },
                plugins: {
                    datalabels: {
                        backgroundColor: function(context) {
                            return context.dataset.backgroundColor;
                        },
                        borderRadius: 4,
                        color: 'white',
                        font: {
                            weight: 'bold'
                        },
                        anchor: 'right',
                        textAlign: 'center',
                        display: 'auto',
                        clamp: true,
                        formatter: function(value, ctx) {
                            let sum = 0;
                            let dataArr = ctx.dataset.data;
                            dataArr.map(data => {
                                sum += data;
                            });
                            let percentage = sum === 0 ? 0 + "%" : (value * 100 / sum).toFixed(2) + "%";
                            return percentage;
                        },
                    },
                },

                }
            });

            this.chart_container[chart_id] = lbsMyChart;
            if (chart_data && chart_data["datasets"].length > 0) self.lbsChartColors(item.chart_item_color, lbsMyChart, chart_type, chart_family, item.lbs_bar_chart_stacked, item.semi_circle_chart, item.lbs_show_data_value, chart_data, item);

        },

        lbsHideFunction: function(options, item, lbsChartFamily, chartType) {
            return options;
        },

        lbsChartColors: function(palette, lbsMyChart, lbsChartType, lbsChartFamily, stack, semi_circle, lbs_show_data_value, chart_data, item) {
            chart_data;
            var self = this;
            var currentPalette = "cool";
            if (!palette) palette = currentPalette;
            currentPalette = palette;

            /*Gradients
              The keys are percentage and the values are the color in a rgba format.
              You can have as many "color stops" (%) as you like.
              0% and 100% is not optional.*/
            var gradient;
            switch (palette) {
                case 'cool':
                    gradient = {
                        0: [255, 255, 255, 1],
                        20: [220, 237, 200, 1],
                        45: [66, 179, 213, 1],
                        65: [26, 39, 62, 1],
                        100: [0, 0, 0, 1]
                    };
                    break;
                case 'warm':
                    gradient = {
                        0: [255, 255, 255, 1],
                        20: [254, 235, 101, 1],
                        45: [228, 82, 27, 1],
                        65: [77, 52, 47, 1],
                        100: [0, 0, 0, 1]
                    };
                    break;
                case 'neon':
                    gradient = {
                        0: [255, 255, 255, 1],
                        20: [255, 236, 179, 1],
                        45: [232, 82, 133, 1],
                        65: [106, 27, 154, 1],
                        100: [0, 0, 0, 1]
                    };
                    break;

                case 'default':
                    var color_set = ['#F04F65', '#f69032', '#fdc233', '#53cfce', '#36a2ec', '#8a79fd', '#b1b5be', '#1c425c', '#8c2620', '#71ecef', '#0b4295', '#f2e6ce', '#1379e7']
            }

            //Find datasets and length
            var chartType = lbsMyChart.config.type;
            switch (chartType) {
                case "pie":
                case "doughnut":
                case "polarArea":
                    if (lbsMyChart.config.data.datasets[0]){
                        var datasets = lbsMyChart.config.data.datasets[0];
                        var setsCount = datasets.data.length;
                    }
                    break;

                case "bar":
                case "horizontalBar":
                case "line":
                    if (lbsMyChart.config.data.datasets[0]){
                        var datasets = lbsMyChart.config.data.datasets;
                        var setsCount = datasets.length;
                    }
                    break;
            }

            //Calculate colors
            var chartColors = [];

            if (palette !== "default") {
                //Get a sorted array of the gradient keys
                var gradientKeys = Object.keys(gradient);
                gradientKeys.sort(function(a, b) {
                    return +a - +b;
                });
                for (var i = 0; i < setsCount; i++) {
                    var gradientIndex = (i + 1) * (100 / (setsCount + 1)); //Find where to get a color from the gradient
                    for (var j = 0; j < gradientKeys.length; j++) {
                        var gradientKey = gradientKeys[j];
                        if (gradientIndex === +gradientKey) { //Exact match with a gradient key - just get that color
                            chartColors[i] = 'rgba(' + gradient[gradientKey].toString() + ')';
                            break;
                        } else if (gradientIndex < +gradientKey) { //It's somewhere between this gradient key and the previous
                            var prevKey = gradientKeys[j - 1];
                            var gradientPartIndex = (gradientIndex - prevKey) / (gradientKey - prevKey); //Calculate where
                            var color = [];
                            for (var k = 0; k < 4; k++) { //Loop through Red, Green, Blue and Alpha and calculate the correct color and opacity
                                color[k] = gradient[prevKey][k] - ((gradient[prevKey][k] - gradient[gradientKey][k]) * gradientPartIndex);
                                if (k < 3) color[k] = Math.round(color[k]);
                            }
                            chartColors[i] = 'rgba(' + color.toString() + ')';
                            break;
                        }
                    }
                }
            } else {
                for (var i = 0, counter = 0; i < setsCount; i++, counter++) {
                    if (counter >= color_set.length) counter = 0; // reset back to the beginning

                    chartColors.push(color_set[counter]);
                }
            }

            var datasets = lbsMyChart.config.data.datasets;
            var options = lbsMyChart.config.options;

            options.legend.labels.usePointStyle = true;
            if (lbsChartFamily == "circle") {
                if (lbs_show_data_value) {
                    options.legend.position = 'bottom';
                    options.layout.padding.top = 10;
                    options.layout.padding.bottom = 20;
                    options.layout.padding.left = 20;
                    options.layout.padding.right = 20;
                } else {
                    options.legend.position = 'top';
                }

                options = self.lbsHideFunction(options, item, lbsChartFamily, chartType);

                options.plugins.datalabels.align = 'center';
                options.plugins.datalabels.anchor = 'end';
                options.plugins.datalabels.borderColor = 'white';
                options.plugins.datalabels.borderRadius = 25;
                options.plugins.datalabels.borderWidth = 2;
                options.plugins.datalabels.clamp = true;
                options.plugins.datalabels.clip = false;

                options.tooltips.callbacks = {
                    title: function(tooltipItem, data) {
                        var lbs_self = self;
                        var k_amount = data.datasets[tooltipItem[0].datasetIndex]['data'][tooltipItem[0].index];
                        var lbs_selection = chart_data.lbs_selection;
                        if (lbs_selection === 'monetary') {
                            var lbs_currency_id = chart_data.lbs_currency;
                            k_amount = KsGlobalFunction.lbs_monetary(k_amount, lbs_currency_id);
                            return data.datasets[tooltipItem[0].datasetIndex]['label'] + " : " + k_amount
                        } else if (lbs_selection === 'custom') {
                            var lbs_field = chart_data.lbs_field;
                            k_amount = field_utils.format.float(k_amount, Float64Array, {digits:[0,item.lbs_precision_digits]});
                            return data.datasets[tooltipItem[0].datasetIndex]['label'] + " : " + k_amount + " " + lbs_field;
                        } else {
                            k_amount = field_utils.format.float(k_amount, Float64Array, {digits:[0,item.lbs_precision_digits]});
                            return data.datasets[tooltipItem[0].datasetIndex]['label'] + " : " + k_amount
                        }
                    },
                    label: function(tooltipItem, data) {
                        return data.labels[tooltipItem.index];
                    },
                }
                for (var i = 0; i < datasets.length; i++) {
                    datasets[i].backgroundColor = chartColors;
                    datasets[i].borderColor = "rgba(255,255,255,1)";
                }
                if (semi_circle && (chartType === "pie" || chartType === "doughnut")) {
                    options.rotation = 1 * Math.PI;
                    options.circumference = 1 * Math.PI;
                }
            } else if (lbsChartFamily == "square") {
                options = self.lbsHideFunction(options, item, lbsChartFamily, chartType);

                options.scales.xAxes[0].gridLines.display = false;
                options.scales.yAxes[0].ticks.beginAtZero = true;

                options.plugins.datalabels.align = 'end';

                options.plugins.datalabels.formatter = function(value, ctx) {
                    var lbs_selection = chart_data.lbs_selection;
                        if (lbs_selection === 'monetary') {
                            var lbs_currency_id = chart_data.lbs_currency;
                            var lbs_data = value;
                            lbs_data = KsGlobalFunction._onKsGlobalFormatter(lbs_data, item.data_formatting, item.lbs_precision_digits);
                            lbs_data = KsGlobalFunction.lbs_monetary(lbs_data, lbs_currency_id);
                           return lbs_data;
                        } else if (lbs_selection === 'custom') {
                            var lbs_field = chart_data.lbs_field;
                            return KsGlobalFunction._onKsGlobalFormatter(value, item.data_formatting, item.lbs_precision_digits) + ' ' + lbs_field;

                        } else {
                           return KsGlobalFunction._onKsGlobalFormatter(value, item.data_formatting, item.lbs_precision_digits);
                        }
                };

                if (chartType === "line") {
                    options.plugins.datalabels.backgroundColor = function(context) {
                        return context.dataset.borderColor;
                    };
                }

                if (chartType === "horizontalBar") {
                    options.scales.xAxes[0].ticks.callback = function(value, index, values) {
                        var lbs_selection = chart_data.lbs_selection;
                        if (lbs_selection === 'monetary') {
                            var lbs_currency_id = chart_data.lbs_currency;
                            var lbs_data = value;
                            lbs_data = KsGlobalFunction._onKsGlobalFormatter(lbs_data, item.data_formatting, item.lbs_precision_digits);
                            lbs_data = KsGlobalFunction.lbs_monetary(lbs_data, lbs_currency_id);
                           return lbs_data;
                        } else if (lbs_selection === 'custom') {
                            var lbs_field = chart_data.lbs_field;
                            return KsGlobalFunction._onKsGlobalFormatter(value, item.data_formatting, item.lbs_precision_digits) + ' ' + lbs_field;

                        } else {
                           return KsGlobalFunction._onKsGlobalFormatter(value, item.data_formatting, item.lbs_precision_digits);
                        }
                    }
                    options.scales.xAxes[0].ticks.beginAtZero = true;
                } else {
                    options.scales.yAxes[0].ticks.callback = function(value, index, values) {
                        var lbs_selection = chart_data.lbs_selection;
                        if (lbs_selection === 'monetary') {
                            var lbs_currency_id = chart_data.lbs_currency;
                            var lbs_data = value;
                            lbs_data = KsGlobalFunction._onKsGlobalFormatter(lbs_data, item.data_formatting, item.lbs_precision_digits);
                            lbs_data = KsGlobalFunction.lbs_monetary(lbs_data, lbs_currency_id);
                           return lbs_data;
                        } else if (lbs_selection === 'custom') {
                            var lbs_field = chart_data.lbs_field;
                            return KsGlobalFunction._onKsGlobalFormatter(value, item.data_formatting, item.lbs_precision_digits) + ' ' + lbs_field;

                        } else {
                           return KsGlobalFunction._onKsGlobalFormatter(value, item.data_formatting, item.lbs_precision_digits);
                        }
                    }
                }

                options.tooltips.callbacks = {
                    label: function(tooltipItem, data) {
                        var lbs_self = self;
                        var k_amount = data.datasets[tooltipItem.datasetIndex]['data'][tooltipItem.index];
                        var lbs_selection = chart_data.lbs_selection;
                        if (lbs_selection === 'monetary') {
                            var lbs_currency_id = chart_data.lbs_currency;
                            k_amount = KsGlobalFunction.lbs_monetary(k_amount, lbs_currency_id);
                            return data.datasets[tooltipItem.datasetIndex]['label'] + " : " + k_amount
                        } else if (lbs_selection === 'custom') {
                            var lbs_field = chart_data.lbs_field;
                            k_amount = field_utils.format.float(k_amount, Float64Array, {digits:[0,item.lbs_precision_digits]});
                            return data.datasets[tooltipItem.datasetIndex]['label'] + " : " + k_amount + " " + lbs_field;
                        } else {
                            k_amount = field_utils.format.float(k_amount, Float64Array,{digits:[0,item.lbs_precision_digits]});
                            return data.datasets[tooltipItem.datasetIndex]['label'] + " : " + k_amount
                        }
                    }
                }

                for (var i = 0; i < datasets.length; i++) {
                    switch (lbsChartType) {
                        case "bar":
                        case "horizontalBar":
                            if (datasets[i].type && datasets[i].type == "line") {
                                datasets[i].borderColor = chartColors[i];
                                datasets[i].backgroundColor = "rgba(255,255,255,0)";
                                datasets[i]['datalabels'] = {
                                    backgroundColor: chartColors[i],
                                }
                            } else {
                                datasets[i].backgroundColor = chartColors[i];
                                datasets[i].borderColor = "rgba(255,255,255,0)";
                                options.scales.xAxes[0].stacked = stack;
                                options.scales.yAxes[0].stacked = stack;
                            }
                            break;
                        case "line":
                            datasets[i].borderColor = chartColors[i];
                            datasets[i].backgroundColor = "rgba(255,255,255,0)";
                            break;
                        case "area":
                            datasets[i].borderColor = chartColors[i];
                            break;
                    }
                }

            }
            lbsMyChart.update();
        },

        onChartCanvasClick: function(evt) {

            var self = this;
            if (evt.currentTarget.classList.value !== 'lbs_list_canvas_click') {
                var item_id = evt.currentTarget.dataset.chartId;
                if (item_id in self.lbsUpdateDashboard) {
                    clearInterval(self.lbsUpdateDashboard[item_id]);
                    delete self.lbsUpdateDashboard[item_id]
                }
                var myChart = self.chart_container[item_id];
                var activePoint = myChart.getElementAtEvent(evt)[0];
                if (activePoint) {
                    var item_data = self.lbs_dashboard_data.lbs_item_data[item_id];
                    var groupBy = JSON.parse(item_data["lbs_chart_data"])['groupby'];
                    if (activePoint._chart.data.domains) {
                        var sequnce = item_data.sequnce ? item_data.sequnce : 0;

                        var domain = activePoint._chart.data.domains[activePoint._index]
                        if (item_data.max_sequnce != 0 && sequnce < item_data.max_sequnce) {
                            self._rpc({
                                model: 'lbs.dashboard_items',
                                method: 'lbs_fetch_drill_down_data',
                                args: [item_id, domain, sequnce]
                            }).then(function(result) {
                                self.lbs_dashboard_data.lbs_item_data[item_id]['sequnce'] = result.sequence;
                                self.lbs_dashboard_data.lbs_item_data[item_id]['isDrill'] = true;
                                if (result.lbs_chart_data) {
                                    self.lbs_dashboard_data.lbs_item_data[item_id]['dashboard_item_type'] = result.lbs_chart_type;
                                    self.lbs_dashboard_data.lbs_item_data[item_id]['lbs_chart_data'] = result.lbs_chart_data;
                                    if (self.lbs_dashboard_data.lbs_item_data[item_id].domains) {
                                        self.lbs_dashboard_data.lbs_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.lbs_chart_data).previous_domain;
                                    } else {
                                        self.lbs_dashboard_data.lbs_item_data[item_id]['domains'] = {}
                                        self.lbs_dashboard_data.lbs_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.lbs_chart_data).previous_domain;
                                    }
                                    $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_item_drill_up").removeClass('d-none');
                                    $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_item_chart_info").removeClass('d-none')
                                    $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_color_option").removeClass('d-none')
                                    $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_quick_edit_action_popup").removeClass('d-sm-block ');
                                    $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_more_action").addClass('d-none');

                                    $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").empty();
                                    var item_data = self.lbs_dashboard_data.lbs_item_data[item_id]
                                    self._renderChart($(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]), item_data);
                                } else {
                                    if ('domains' in self.lbs_dashboard_data.lbs_item_data[item_id]) {
                                        self.lbs_dashboard_data.lbs_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.lbs_list_view_data).previous_domain;
                                    } else {
                                        self.lbs_dashboard_data.lbs_item_data[item_id]['domains'] = {}
                                        self.lbs_dashboard_data.lbs_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.lbs_list_view_data).previous_domain;
                                    }
                                    self.lbs_dashboard_data.lbs_item_data[item_id]['isDrill'] = true;
                                    self.lbs_dashboard_data.lbs_item_data[item_id]['sequnce'] = result.sequence;
                                    self.lbs_dashboard_data.lbs_item_data[item_id]['lbs_list_view_data'] = result.lbs_list_view_data;
                                    self.lbs_dashboard_data.lbs_item_data[item_id]['lbs_list_view_type'] = result.lbs_list_view_type;
                                    self.lbs_dashboard_data.lbs_item_data[item_id]['dashboard_item_type'] = 'lbs_list_view';

                                    $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_item_drill_up").removeClass('d-none');

                                    $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_item_chart_info").addClass('d-none')
                                    $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_color_option").addClass('d-none')
                                    $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").empty();
                                    $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_quick_edit_action_popup").removeClass('d-sm-block ');

                                    $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_more_action").addClass('d-none');
                                    var item_data = self.lbs_dashboard_data.lbs_item_data[item_id]
                                    var $container = self.renderListViewData(item_data);
                                    $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").append($container).addClass('lbs_overflow');
                                }
                            });
                        } else {
                        if (item_data.action) {
                                if (!item_data.lbs_is_client_action){
                                    var action = Object.assign({}, item_data.action);
                                    if (action.view_mode.includes('tree')) action.view_mode = action.view_mode.replace('tree', 'list');
                                    for (var i = 0; i < action.views.length; i++) action.views[i][1].includes('tree') ? action.views[i][1] = action.views[i][1].replace('tree', 'list') : action.views[i][1];
                                    action['domain'] = domain || [];
                                    action['search_view_id'] = [action.search_view_id, 'search']
                                }else{
                                    var action = Object.assign({}, item_data.action[0]);
                                    if (action.params){
                                        action.params.default_active_id || 'mailbox_inbox';
                                        }else{
                                            action.params = {
                                            'default_active_id': 'mailbox_inbox'
                                            };
                                            action.context = {}
                                            action.context.params = {
                                            'active_model': false
                                            };
                                        }
                                }
                            } else {
                                var action = {
                                    name: _t(item_data.name),
                                    type: 'ir.actions.act_window',
                                    res_model: item_data.lbs_model_name,
                                    domain: domain || [],
                                    context: {
                                        'group_by': groupBy ? groupBy:false ,
                                    },
                                    views: [
                                        [false, 'list'],
                                        [false, 'form']
                                    ],
                                    view_mode: 'list',
                                    target: 'current',
                                }
                            }
                            if (item_data.lbs_show_records) {

                                self.do_action(action, {
                                    on_reverse_breadcrumb: self.on_reverse_breadcrumb,
                                });
                            }
                        }
                    }
                }
            } else {
                var item_id = $(evt.target).parent().data().itemId;
                if (this.lbsUpdateDashboard[item_id]) {
                    clearInterval(this.lbsUpdateDashboard[item_id]);
                    delete self.lbsUpdateDashboard[item_id];
                }
                var item_data = self.lbs_dashboard_data.lbs_item_data[item_id]
                if (self.lbs_dashboard_data.lbs_item_data[item_id].max_sequnce) {

                    var sequence = item_data.sequnce ? item_data.sequnce : 0

                    var domain = $(evt.target).parent().data().domain;

                    if ($(evt.target).parent().data().last_seq !== sequence) {
                        self._rpc({
                            model: 'lbs.dashboard_items',
                            method: 'lbs_fetch_drill_down_data',
                            args: [item_id, domain, sequence]
                        }).then(function(result) {
                            if (result.lbs_list_view_data) {
                                if (self.lbs_dashboard_data.lbs_item_data[item_id].domains) {
                                    self.lbs_dashboard_data.lbs_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.lbs_list_view_data).previous_domain;
                                } else {
                                    self.lbs_dashboard_data.lbs_item_data[item_id]['domains'] = {}
                                    self.lbs_dashboard_data.lbs_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.lbs_list_view_data).previous_domain;
                                }
                                self.lbs_dashboard_data.lbs_item_data[item_id]['isDrill'] = true;
                                self.lbs_dashboard_data.lbs_item_data[item_id]['sequnce'] = result.sequence;
                                self.lbs_dashboard_data.lbs_item_data[item_id]['lbs_list_view_data'] = result.lbs_list_view_data;
                                self.lbs_dashboard_data.lbs_item_data[item_id]['lbs_list_view_type'] = result.lbs_list_view_type;
                                self.lbs_dashboard_data.lbs_item_data[item_id]['dashboard_item_type'] = 'lbs_list_view';
                                self.lbs_dashboard_data.lbs_item_data[item_id]['sequnce'] = result.sequence;
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").empty();
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_search_plus").addClass('d-none')
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_search_minus").addClass('d-none')
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_item_drill_up").removeClass('d-none');
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_pager").addClass('d-none');
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_item_action_export").addClass('d-none');
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_quick_edit_action_popup").removeClass('d-sm-block ');

                                var item_data = self.lbs_dashboard_data.lbs_item_data[item_id]
                                var $container = self.renderListViewData(item_data);
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").append($container);
                            } else {
                                self.lbs_dashboard_data.lbs_item_data[item_id]['lbs_chart_data'] = result.lbs_chart_data;
                                self.lbs_dashboard_data.lbs_item_data[item_id]['sequnce'] = result.sequence;
                                self.lbs_dashboard_data.lbs_item_data[item_id]['dashboard_item_type'] = result.lbs_chart_type;
                                self.lbs_dashboard_data.lbs_item_data[item_id]['isDrill'] = true;
                                if (self.lbs_dashboard_data.lbs_item_data[item_id].domains) {
                                    self.lbs_dashboard_data.lbs_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.lbs_chart_data).previous_domain;
                                } else {
                                    self.lbs_dashboard_data.lbs_item_data[item_id]['domains'] = {}
                                    self.lbs_dashboard_data.lbs_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.lbs_chart_data).previous_domain;
                                }
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_item_chart_info").removeClass('d-none')
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_color_option").removeClass('d-none')
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_search_plus").addClass('d-none')
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_search_minus").addClass('d-none')
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_item_drill_up").removeClass('d-none');
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_pager").addClass('d-none');
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_quick_edit_action_popup").removeClass('d-sm-block ');
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_item_action_export").addClass('d-none');
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").empty();
                                var item_data = self.lbs_dashboard_data.lbs_item_data[item_id]
                                self._renderChart($(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]), item_data);
                            }
                        });
                    }
                }
            }
            evt.stopPropagation();
        },

        lbsOnDrillUp: function(e) {
            var self = this;
            var item_id = e.currentTarget.dataset.itemId;
            var item_data = self.lbs_dashboard_data.lbs_item_data[item_id];
            var domain;
            if(item_data) {

                if ('domains' in item_data) {
                    domain = item_data['domains'][item_data.sequnce - 1] ? item_data['domains'][item_data.sequnce - 1] : []
                    var sequnce = item_data.sequnce - 2;
                    if (sequnce >= 0) {
                        self._rpc({
                            model: 'lbs.dashboard_items',
                            method: 'lbs_fetch_drill_down_data',
                            args: [item_id, domain, sequnce]
                        }).then(function(result) {
                            self.lbs_dashboard_data.lbs_item_data[item_id]['lbs_chart_data'] = result.lbs_chart_data;
                            self.lbs_dashboard_data.lbs_item_data[item_id]['sequnce'] = result.sequence;
                            if (result.lbs_chart_type)  self.lbs_dashboard_data.lbs_item_data[item_id]['dashboard_item_type'] = result.lbs_chart_type;
                            $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_item_drill_up").removeClass('d-none');
                            $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").empty();
                            if (result.lbs_chart_data) {
                                var item_data = self.lbs_dashboard_data.lbs_item_data[item_id];
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_item_chart_info").removeClass('d-none')
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_color_option").removeClass('d-none')
                                self._renderChart($(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]), item_data);

                            } else {
                                self.lbs_dashboard_data.lbs_item_data[item_id]['lbs_list_view_data'] = result.lbs_list_view_data;
                                self.lbs_dashboard_data.lbs_item_data[item_id]['lbs_list_view_type'] = result.lbs_list_view_type;
                                self.lbs_dashboard_data.lbs_item_data[item_id]['dashboard_item_type'] = 'lbs_list_view';
                                var item_data = self.lbs_dashboard_data.lbs_item_data[item_id]
                                var $container = self.renderListViewData(item_data);
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_pager").addClass('d-none');
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_item_chart_info").addClass('d-none')
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_color_option").addClass('d-none')
                                $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".card-body").append($container);
                            }

                        });

                    } else {
                        $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_item_drill_up").addClass('d-none');
                        $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_item_chart_info").removeClass('d-none')
                        $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_color_option").removeClass('d-none')
                        $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_quick_edit_action_popup").addClass('d-sm-block ');
                        $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_more_action").removeClass('d-none');
                        $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_item_action_export").removeClass('d-none')
                        $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_search_plus").removeClass('d-none')
                        $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_search_minus").removeClass('d-none')
                        self.lbsFetchUpdateItem(item_id)
                        var updateValue = self.lbs_dashboard_data.lbs_item_data[item_id]["update_items_data"];
                        if (updateValue) {
                            var updateinterval = setInterval(function() {
                                self.lbsFetchChartItem(item_id)
                            }, updateValue);
                            self.lbsUpdateDashboard[item_id] = updateinterval;
                        }
                    }

                } else {
                    if(!domain){
                    $(self.$el.find(".grid-stack-item[gs-id=" + item_id + "]").children()[0]).find(".lbs_dashboard_item_drill_up").addClass('d-none');
                }

                }
            }

            e.stopPropagation();
        },

        lbsFetchChartItem: function(id) {
            var self = this;
            var item_data = self.lbs_dashboard_data.lbs_item_data[id];

            return self._rpc({
                model: 'lbs.dashboard',
                method: 'lbs_fetch_item',
                args: [
                    [item_data.id], self.lbs_dashboard_id, self.lbsGetParamsForItemFetch(id)
                ],
                context: self.getContext(),
            }).then(function(new_item_data) {
                this.lbs_dashboard_data.lbs_item_data[id] = new_item_data[id];
                $(self.$el.find(".grid-stack-item[gs-id=" + id + "]").children()[0]).find(".card-body").empty();
                var item_data = self.lbs_dashboard_data.lbs_item_data[id]
                if (item_data.lbs_list_view_data) {
                    var item_view = $(self.$el.find(".grid-stack-item[gs-id=" + id + "]").children()[0]);
                    var $container = self.renderListViewData(item_data);
                    item_view.find(".card-body").append($container);
                    var lbs_length = JSON.parse(item_data['lbs_list_view_data']).data_rows.length
                    if (new_item_data["lbs_list_view_type"] === "ungrouped" && JSON.parse(item_data['lbs_list_view_data']).data_rows.length) {
                        item_view.find('.lbs_pager').removeClass('d-none');
                        if (item.lbs_record_count <= item.lbs_pagination_limit) item_view.find('.lbs_load_next').addClass('lbs_event_offer_list');
                        item_view.find('.lbs_value').text("1-" + JSON.parse(item_data['lbs_list_view_data']).data_rows.length);
                    } else {
                        item_view.find('.lbs_pager').addClass('d-none');
                    }
                } else {
                    self._renderChart($(self.$el.find(".grid-stack-item[gs-id=" + id + "]").children()[0]), item_data);
                }
            }.bind(this));
        },

        onChartMoreInfoClick: function(evt) {
            var self = this;
            var item_id = evt.currentTarget.dataset.itemId;
            var item_data = self.lbs_dashboard_data.lbs_item_data[item_id];
            var groupBy = item_data.chart_groupby_type === 'relational_type' ? item_data.lbs_chart_relation_groupby_name : item_data.lbs_chart_relation_groupby_name + ':' + item_data.lbs_chart_date_groupby;
            var domain = JSON.parse(item_data.lbs_chart_data).previous_domain

            if (item_data.lbs_show_records) {
                if (item_data.action) {

                    if (!item_data.lbs_is_client_action){
                        var action = Object.assign({}, item_data.action);
                        if (action.view_mode.includes('tree')) action.view_mode = action.view_mode.replace('tree', 'list');
                            for (var i = 0; i < action.views.length; i++) action.views[i][1].includes('tree') ? action.views[i][1] = action.views[i][1].replace('tree', 'list') : action.views[i][1];
                                action['domain'] = item_data.lbs_domain || [];
                                action['search_view_id'] = [action.search_view_id, 'search']
                        }else{
                            var action = Object.assign({}, item_data.action[0]);
                            if (action.params){
                                action.params.default_active_id || 'mailbox_inbox';
                                }else{
                                    action.params = {
                                    'default_active_id': 'mailbox_inbox'
                                    }
                                    action.context = {}
                                    action.context.params = {
                                    'active_model': false
                                    };
                                }
                            }
                } else {
                    var action = {
                        name: _t(item_data.name),
                        type: 'ir.actions.act_window',
                        res_model: item_data.lbs_model_name,
                        domain: domain || [],
                        context: {
                            'group_by': groupBy ? groupBy:false ,
                        },
                        views: [
                            [false, 'list'],
                            [false, 'form']
                        ],
                        view_mode: 'list',
                        target: 'current',
                    }
                }
                self.do_action(action, {
                    on_reverse_breadcrumb: self.on_reverse_breadcrumb,
                });
            }
        },

        _lbsRenderNoItemView: function() {
            $('.lbs_dashboard_items_list').remove();
            var self = this;
            $(QWeb.render('lbsNoItemView')).appendTo(self.$el)

        },

        _lbsRenderEditMode: function() {

            var self = this;
            self.lbs_mode = 'edit';
            self.lbs_remove_update_interval();

            $('#lbs_dashboard_title_input').val(self.lbs_dashboard_data.name);

            $('.lbs_am_element').addClass("lbs_hide");
            $('.lbs_em_element').removeClass("lbs_hide");
            $('.lbs_dashboard_print_pdf').addClass("lbs_hide");

            self.$el.find('.lbs_item_click').addClass('lbs_item_not_click').removeClass('lbs_item_click');
            self.$el.find('.lbs_dashboard_item').removeClass('lbs_dashboard_item_header_hover');
            self.$el.find('.lbs_dashboard_item_header').removeClass('lbs_dashboard_item_header_hover');

            self.$el.find('.lbs_dashboard_item_l2').removeClass('lbs_dashboard_item_header_hover');
            self.$el.find('.lbs_dashboard_item_header_l2').removeClass('lbs_dashboard_item_header_hover');

            self.$el.find('.lbs_dashboard_item_l5').removeClass('lbs_dashboard_item_header_hover');

            self.$el.find('.lbs_dashboard_item_button_container').removeClass('lbs_dashboard_item_header_hover');

            self.$el.find('.lbs_dashboard_link').addClass("lbs_hide")
            self.$el.find('.lbs_dashboard_top_settings').addClass("lbs_hide")
            self.$el.find('.lbs_dashboard_edit_mode_settings').removeClass("lbs_hide")

            // Adding Chart grab able cals
            self.$el.find('.lbs_start_tv_dashboard').addClass('lbs_hide');
            self.$el.find('.lbs_chart_container').addClass('lbs_item_not_click');
            self.$el.find('.lbs_list_view_container').addClass('lbs_item_not_click');

            if (self.grid) {
                self.grid.enable();
            }
        },


        _lbsRenderActiveMode: function() {
            var self = this
            self.lbs_mode = 'active';

            if (self.grid && $('.grid-stack').data('gridstack')) {
                $('.grid-stack').data('gridstack').disable();
            }

            if (self.lbs_dashboard_data.lbs_child_boards) {
                var $layout_container = $(QWeb.render('lbs_dn_layout_container', {
                    lbs_selected_board_id: self.lbs_dashboard_data.lbs_selected_board_id,
                    lbs_child_boards: self.lbs_dashboard_data.lbs_child_boards,
                    lbs_multi_layout: self.lbs_dashboard_data.multi_layouts,
                    lbs_dash_name: self.lbs_dashboard_data.name
                }));
                $('#lbs_dashboard_title .lbs_am_element').replaceWith($layout_container);
                $('#lbs_dashboard_title_label').replaceWith($layout_container);
            } else {
                $('#lbs_dashboard_title_label').text(self.lbs_dashboard_data.name);
            }

            $('#lbs_dashboard_title_label').text(self.lbs_dashboard_data.name);

            $('.lbs_am_element').removeClass("lbs_hide");
            $('.lbs_em_element').addClass("lbs_hide");
            $('.lbs_dashboard_print_pdf').removeClass("lbs_hide");
            if (self.lbs_dashboard_data.lbs_item_data) $('.lbs_am_content_element').removeClass("lbs_hide");

            self.$el.find('.lbs_item_not_click').addClass('lbs_item_click').removeClass('lbs_item_not_click')
            self.$el.find('.lbs_dashboard_item').addClass('lbs_dashboard_item_header_hover')
            self.$el.find('.lbs_dashboard_item_header').addClass('lbs_dashboard_item_header_hover')

            self.$el.find('.lbs_dashboard_item_l2').addClass('lbs_dashboard_item_header_hover')
            self.$el.find('.lbs_dashboard_item_header_l2').addClass('lbs_dashboard_item_header_hover')

            //      For layout 5
            self.$el.find('.lbs_dashboard_item_l5').addClass('lbs_dashboard_item_header_hover')


            self.$el.find('.lbs_dashboard_item_button_container').addClass('lbs_dashboard_item_header_hover');

            self.$el.find('.lbs_dashboard_top_settings').removeClass("lbs_hide")
            self.$el.find('.lbs_dashboard_edit_mode_settings').addClass("lbs_hide")

            self.$el.find('.lbs_start_tv_dashboard').removeClass('lbs_hide');
            self.$el.find('.lbs_chart_container').removeClass('lbs_item_not_click lbs_item_click');
            self.$el.find('.lbs_list_view_container').removeClass('lbs_item_click');

            self.lbs_set_update_interval();
            self.grid.commit();
        },

        _lbsToggleEditMode: function() {
            var self = this
            if (self.lbsDashboardEditMode) {
                self._lbsRenderActiveMode()
                self.lbsDashboardEditMode = false
            } else if (!self.lbsDashboardEditMode) {
                self._lbsRenderEditMode()
                self.lbsDashboardEditMode = true
            }

        },

        onAddItemTypeClick: function(e) {
            var self = this;
            if (e.currentTarget.dataset.item !== "lbs_json") {
                self.do_action({
                    type: 'ir.actions.act_window',
                    res_model: 'lbs.dashboard_items',
                    view_id: 'lbs_dashboard_ninja_list_form_view',
                    views: [
                        [false, 'form']
                    ],
                    target: 'current',
                    context: {
                        'lbs_dashboard_id': self.lbs_dashboard_id,
                        'dashboard_item_type': e.currentTarget.dataset.item,
                        'form_view_ref': 'lbs_dashboard.item_form_view',
                        'form_view_initial_mode': 'edit',
                        'set_interval': self.lbs_dashboard_data.set_interval,
                        'data_formatting':self.lbs_dashboard_data.data_formatting,
                    },
                }, {
                    on_reverse_breadcrumb: this.on_reverse_breadcrumb,
                });
            } else {
                self.lbsImportItemJson(e);
            }
        },

        lbsImportItemJson: function(e) {
            var self = this;
            $('.lbs_input_import_item_button').click();
        },

        lbsImportItem: function(e) {
            var self = this;
            var fileReader = new FileReader();
            fileReader.onload = function() {
                $('.lbs_input_import_item_button').val('');
//                framework.blockUI();
                self._rpc({
                    model: 'lbs.dashboard',
                    method: 'lbs_import_item',
                    args: [self.lbs_dashboard_id],
                    kwargs: {
                        file: fileReader.result,
                        dashboard_id: self.lbs_dashboard_id
                    }
                }).then(function(result) {
                    if (result === "Success") {

                        $.when(self.lbs_fetch_data()).then(function() {
                            $.when(self.lbs_fetch_items_data()).then(function(result){
                                self.lbsRenderDashboard();
                            });

//                            framework.unblockUI();
                        });
                    }
                });
            };
            fileReader.readAsText($('.lbs_input_import_item_button').prop('files')[0]);
        },

        _onKsAddLayoutClick: function() {
            var self = this;

            self.do_action({
                type: 'ir.actions.act_window',
                res_model: 'lbs.dashboard_items',
                view_id: 'lbs_dashboard_ninja_list_form_view',
                views: [
                    [false, 'form']
                ],
                target: 'current',
                context: {
                    'lbs_dashboard_id': self.lbs_dashboard_id,
                    'form_view_ref': 'lbs_dashboard.item_form_view',
                    'form_view_initial_mode': 'edit',
                },
            }, {
                on_reverse_breadcrumb: this.on_reverse_breadcrumb,
            });
        },

        _onKsEditLayoutClick: function() {
            var self = this;
            self.grid.setStatic(false);
            self._lbsRenderEditMode();
        },

        _onKsSaveLayoutClick: function() {
            this.grid.setStatic(true)
            var self = this;
            //        Have  to save dashboard here
            var dashboard_title = $('#lbs_dashboard_title_input').val();
            if (dashboard_title != false && dashboard_title != 0 && dashboard_title !== self.lbs_dashboard_data.name) {
                self.lbs_dashboard_data.name = dashboard_title;
                var model = 'lbs.dashboard';
                var rec_id = self.lbs_dashboard_id;

                if(this.lbs_dashboard_data.lbs_selected_board_id && this.lbs_dashboard_data.lbs_child_boards){
                    this.lbs_dashboard_data.lbs_child_boards[this.lbs_dashboard_data.lbs_selected_board_id][0] = dashboard_title;
                    if (this.lbs_dashboard_data.lbs_selected_board_id !== 'lbs_default'){
                        model = 'lbs.dashboard_child';
                        rec_id = this.lbs_dashboard_data.lbs_selected_board_id;
                    }
                }
                this._rpc({
                    model: model,
                    method: 'write',
                    args: [rec_id, {
                        'name': dashboard_title
                    }],
                })
            }
            if (this.lbs_dashboard_data.lbs_item_data) self._lbsSaveCurrentLayout();
            self._lbsRenderActiveMode();
        },

        _onKsCreateLayoutClick: function() {
            var self = this;
            self.grid.setStatic(true)
            var dashboard_title = $('#lbs_dashboard_title_input').val();
            if (dashboard_title ==="") {
                self.call('notification', 'notify', {
                    message: "Dashboard Name is required to save as New Layout.",
                    type: 'warning',
                });
            } else{
                if (!self.lbs_dashboard_data.lbs_child_boards){
                    self.lbs_dashboard_data.lbs_child_boards = {
                        'lbs_default': [this.lbs_dashboard_data.name, self.lbs_dashboard_data.gridstack_config]
                    }
                }
                this.lbs_dashboard_data.name = dashboard_title;

                var grid_config = self.lbs_get_current_gridstack_config();
                this._rpc({
                    model: 'lbs.dashboard',
                    method: 'update_child_board',
                    args: ['create', self.lbs_dashboard_id, {
                        "gridstack_config": JSON.stringify(grid_config),
                        "dashboard_lbs_id": self.lbs_dashboard_id,
                        "name": dashboard_title,
                        "is_active": true,
                        "company_id": self.lbs_dashboard_data.lbs_company_id,
                    }],
                }).then(function(res_id){
                    self.lbs_update_child_board_value(dashboard_title, res_id, grid_config),
                    self._lbsRenderActiveMode();
                });
            }
        },

        lbs_update_child_board_value: function(dashboard_title, res_id, grid_config){
            var self = this;
            var child_board_id = res_id.toString();
            self.lbs_dashboard_data.lbs_selected_board_id = child_board_id;
            var update_data = {};
            update_data[child_board_id] = [dashboard_title, JSON.stringify(grid_config)];
            self.lbs_dashboard_data.lbs_child_boards = _.extend(update_data,self.lbs_dashboard_data.lbs_child_boards);
        },

        _onKsCancelLayoutClick: function() {
            var self = this;
            //        render page again
            $.when(self.lbs_fetch_data()).then(function() {
                $.when(self.lbs_fetch_items_data()).then(function(result){
                    self.lbsRenderDashboard();
                    self.lbs_set_update_interval();
                });
            });
        },

        _onKsItemClick: function(e) {
            var self = this;
            //  To Handle only allow item to open when not clicking on item
            if (self.lbsAllowItemClick) {



                e.preventDefault();
                if (e.target.title != "Customize Item") {
                    var item_id = parseInt(e.currentTarget.firstElementChild.id);
                    var item_data = self.lbs_dashboard_data.lbs_item_data[item_id];
                    if (item_data && item_data.lbs_show_records) {

                        if (item_data.action) {
                            if (!item_data.lbs_is_client_action){
                                var action = Object.assign({}, item_data.action);
                                if (action.view_mode.includes('tree')) action.view_mode = action.view_mode.replace('tree', 'list');
                                for (var i = 0; i < action.views.length; i++) action.views[i][1].includes('tree') ? action.views[i][1] = action.views[i][1].replace('tree', 'list') : action.views[i][1];
                                action['domain'] = item_data.lbs_domain || [];
                                action['search_view_id'] = [action.search_view_id, 'search']
                            }else{
                                var action = Object.assign({}, item_data.action[0]);
                                if (action.params){
                                    action.params.default_active_id || 'mailbox_inbox';
                                    }else{
                                        action.params = {
                                        'default_active_id': 'mailbox_inbox'
                                        }
                                        action.context = {}
                                        action.context.params = {
                                        'active_model': false
                                        };
                                    }
                            }

                        } else {
                            var action = {
                                name: _t(item_data.name),
                                type: 'ir.actions.act_window',
                                res_model: item_data.lbs_model_name,
                                domain: item_data.lbs_domain || "[]",
                                views: [
                                    [false, 'list'],
                                    [false, 'form']
                                ],
                                view_mode: 'list',
                                target: 'current',
                            }
                        }
                        self.do_action(action, {
                            on_reverse_breadcrumb: self.on_reverse_breadcrumb,
                        });
                    }
                }
            } else {
                self.lbsAllowItemClick = true;
            }
        },

        _onKsItemCustomizeClick: function(e) {
            var self = this;
            var id = parseInt($($(e.currentTarget).parentsUntil('.grid-stack').slice(-1)[0]).attr('id'))
            self.lbs_open_item_form_page(id);

            e.stopPropagation();
        },

        lbs_open_item_form_page: function(id) {
            var self = this;
            self.do_action({
                type: 'ir.actions.act_window',
                res_model: 'lbs.dashboard_items',
                view_id: 'lbs_dashboard_ninja_list_form_view',
                views: [
                    [false, 'form']
                ],
                target: 'current',
                context: {
                    'form_view_ref': 'lbs_dashboard.item_form_view',
                    'form_view_initial_mode': 'edit',
                },
                res_id: id
            }, {
                on_reverse_breadcrumb: this.on_reverse_breadcrumb,
            });
        },


        // Note : this is exceptionally bind to this function.
        lbsUpdateDashboardItem: function(ids) {
            var self = this;
            for (var i = 0; i < ids.length; i++) {

                var item_data = self.lbs_dashboard_data.lbs_item_data[ids[i]]
                if (item_data['dashboard_item_type'] == 'lbs_list_view') {
                    var item_view = self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]");
                    var name = item_data.name ?item_data.name : item_data.lbs_model_display_name;
                    item_view.children().find('.lbs_list_view_heading').prop('title', name);
                    item_view.children().find('.lbs_list_view_heading').text(name);
                    item_view.find('.card-body').empty();
                    item_view.find('.lbs_dashboard_item_drill_up').addClass('d-none')
                    item_view.find('.lbs_dashboard_item_action_export').removeClass('d-none')
                    item_view.find('.lbs_dashboard_quick_edit_action_popup ').removeClass('d-none')
                    item_view.find('.card-body').append(self.renderListViewData(item_data));
                    var rows = JSON.parse(item_data['lbs_list_view_data']).data_rows;
                    var lbs_length = rows ? rows.length : false;
                    if (lbs_length) {
                        if (item_view.find('.lbs_pager_name')) {
                            item_view.find('.lbs_pager_name').empty();
                            var $lbs_pager_container = QWeb.render('lbs_pager_template', {
                                item_id: ids[i],
                                intial_count: item_data.lbs_pagination_limit,
                                offset : 1
                            })
                            item_view.find('.lbs_pager_name').append($($lbs_pager_container));
                        }

                            if (lbs_length < item_data.lbs_pagination_limit) item_view.find('.lbs_load_next').addClass('lbs_event_offer_list');
                                item_view.find('.lbs_value').text("1-" + JSON.parse(item_data['lbs_list_view_data']).data_rows.length);

                            if (item_data.lbs_record_data_limit == item_data.lbs_pagination_limit || item_data.lbs_record_count==item_data.lbs_pagination_limit) {
                                item_view.find('.lbs_load_next').addClass('lbs_event_offer_list');
                            }
                    } else {
                        item_view.find('.lbs_pager').addClass('d-none');
                    }
                } else if (item_data['dashboard_item_type'] == 'lbs_tile') {
                    var item_view = self._lbsRenderDashboardTile(item_data);
                    self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").find(".lbs_dashboard_item_hover").replaceWith($(item_view).find('.lbs_dashboarditem_id'));
                } else if (item_data['dashboard_item_type'] == 'lbs_kpi') {
                    var item_view = self.renderKpi(item_data);
                    self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]").find(".lbs_dashboard_item_hover").replaceWith($(item_view).find('.lbs_dashboarditem_id'));
                } else {
                    self.grid.removeWidget(self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]")[0]);
                    self.lbsRenderDashboardItems([item_data]);
                }

            }
            self.grid.setStatic(true);
        },

        _onKsDeleteItemClick: function(e) {
            var self = this;
            var item = $($(e.currentTarget).parentsUntil('.grid-stack').slice(-1)[0])
            var id = parseInt($($(e.currentTarget).parentsUntil('.grid-stack').slice(-1)[0]).attr('gs-id'));
            self.lbs_delete_item(id, item);
            e.stopPropagation();
        },

        lbs_delete_item: function(id, item) {
            var self = this;
            Dialog.confirm(this, (_t("Are you sure you want to remove this item?")), {
                confirm_callback: function() {

                    self._rpc({
                        model: 'lbs.dashboard_items',
                        method: 'unlink',
                        args: [id],
                    }).then(function(result) {

                        // Clean Item Remove Process.
                        self.lbs_remove_update_interval();
                        delete self.lbs_dashboard_data.lbs_item_data[id];
                        self.grid.removeWidget(item);
                        self.lbs_set_update_interval();

                        if (Object.keys(self.lbs_dashboard_data.lbs_item_data).length > 0) {
                            self._lbsSaveCurrentLayout();
                        }
                        else {
                            self._lbsRenderNoItemView();
                            self.lbsRenderDashboard();
                        }
                        $.when(self.lbs_fetch_data()).then(function() {
                            $.when(self.lbs_fetch_items_data()).then(function(){
                                self.lbs_remove_update_interval();
                                self.lbsRenderDashboard();
                                self.lbs_set_update_interval();
                            });
                        });
                    });
                },
            });
        },
       lbs_add_dashboard_item_on_empty: function(e){
       var self = this;
            if (e.currentTarget.dataset.item !== "lbs_json") {
                self.do_action({
                    type: 'ir.actions.act_window',
                    res_model: 'lbs.dashboard_items',
                    view_id: 'lbs_dashboard_ninja_list_form_view',
                    views: [
                        [false, 'form']
                    ],
                    target: 'current',
                    context: {
                        'lbs_dashboard_id': self.lbs_dashboard_id,
                        'form_view_ref': 'lbs_dashboard.item_form_view',
                        'form_view_initial_mode': 'edit',
                    },
                }, {
                    on_reverse_breadcrumb: this.on_reverse_breadcrumb,
                });
            } else {
                self.lbsImportItemJson(e);
            }
       },

        _lbsSaveCurrentLayout: function() {
            var self = this;
            var grid_config = self.lbs_get_current_gridstack_config();
            var model = 'lbs.dashboard_child';
            var rec_id = self.lbs_dashboard_data.lbs_gridstack_config_id;
            self.lbs_dashboard_data.gridstack_config = JSON.stringify(grid_config);
            if(this.lbs_dashboard_data.lbs_selected_board_id && this.lbs_dashboard_data.lbs_child_boards){
                this.lbs_dashboard_data.lbs_child_boards[this.lbs_dashboard_data.lbs_selected_board_id][1] = JSON.stringify(grid_config);
                if (this.lbs_dashboard_data.lbs_selected_board_id !== 'lbs_default'){
                    rec_id = this.lbs_dashboard_data.lbs_selected_board_id;
                }
            }
            if (!config.device.isMobile) {
                this._rpc({
                model: model,
                method: 'write',
                args: [rec_id, {
                    "gridstack_config": JSON.stringify(grid_config)
                }],
            });
            }
        },

        lbs_get_current_gridstack_config: function(){
            var self = this;
            if (document.querySelector('.grid-stack').gridstack){
                var items = document.querySelector('.grid-stack').gridstack.el.gridstack.engine.nodes;
            }
            var grid_config = {}

            if (self.lbs_dashboard_data.gridstack_config) {
                _.extend(grid_config, JSON.parse(self.lbs_dashboard_data.gridstack_config))
            }
            if (items){
                for (var i = 0; i < items.length; i++) {
                    grid_config[items[i].id] = {
                        'x': items[i].x,
                        'y': items[i].y,
                        'w': items[i].w,
                        'h': items[i].h,
                    }
                }
            }
            return grid_config;
        },

        _renderListView: function(item, grid) {
            var self = this;
            var list_view_data = JSON.parse(item.lbs_list_view_data),
                pager = true,
                item_id = item.id,
                data_rows = list_view_data.data_rows,
                length = data_rows ? data_rows.length: false,
                item_title = item.name;
            var $lbsItemContainer = self.renderListViewData(item);
            var  data_calculation_type = self.lbs_dashboard_data.lbs_item_data[item_id].data_calculation_type
            var $lbs_gridstack_container = $(QWeb.render('lbs_gridstack_list_view_container', {
                lbs_chart_title: item_title,
                lbsIsDashboardManager: self.lbs_dashboard_data.lbs_dashboard_manager,
                lbs_dashboard_list: self.lbs_dashboard_data.lbs_dashboard_list,
                item_id: item_id,
                count: '1-' + length,
                offset: 1,
                intial_count: length,
                lbs_pager: pager,
                calculation_type: data_calculation_type
            })).addClass('lbs_dashboarditem_id');

            if (item.lbs_pagination_limit < length  ) {
                $lbs_gridstack_container.find('.lbs_load_next').addClass('lbs_event_offer_list');
            }
            if (length < item.lbs_pagination_limit ) {
                $lbs_gridstack_container.find('.lbs_load_next').addClass('lbs_event_offer_list');
            }
            if (item.lbs_record_data_limit === item.lbs_pagination_limit){
                   $lbs_gridstack_container.find('.lbs_load_next').addClass('lbs_event_offer_list');
            }
            if (length == 0){
                $lbs_gridstack_container.find('.lbs_pager').addClass('d-none');
            }
            if (item.lbs_pagination_limit==0){
            $lbs_gridstack_container.find('.lbs_pager_name').addClass('d-none');
            }

            $lbs_gridstack_container.find('.card-body').append($lbsItemContainer);
            if (item.data_calculation_type === 'query' || item.lbs_list_view_type === "ungrouped"){
                $lbs_gridstack_container.find('.lbs_list_canvas_click').removeClass('lbs_list_canvas_click');
            }
            item.$el = $lbs_gridstack_container;
            if (item_id in self.gridstackConfig) {
                grid.addWidget($lbs_gridstack_container[0], {x:self.gridstackConfig[item_id].x, y:self.gridstackConfig[item_id].y, w:self.gridstackConfig[item_id].w, h:self.gridstackConfig[item_id].h, autoPosition:false, minW:3, maxW:null, minH:3, maxH:null, id:item_id});
            } else {
                grid.addWidget($lbs_gridstack_container[0], {x:0, y:0, w:5, h:4, autoPosition:true, minW:4, maxW:null, minH:3, maxH:null, id:item_id});
            }
        },

        renderListViewData: function(item) {
            var self = this;
            var list_view_data = JSON.parse(item.lbs_list_view_data);
            var item_id = item.id,
                data_rows = list_view_data.data_rows,
                item_title = item.name;
            if (item.lbs_list_view_type === "ungrouped" && list_view_data) {
                if (list_view_data.date_index) {
                    var index_data = list_view_data.date_index;
                    for (var i = 0; i < index_data.length; i++) {
                        for (var j = 0; j < list_view_data.data_rows.length; j++) {
                            var index = index_data[i]
                            var date = list_view_data.data_rows[j]["data"][index]
                            if (date){
                             if( list_view_data.fields_type[index] === 'date'){
                                    list_view_data.data_rows[j]["data"][index] = field_utils.format.date(moment(moment(date).utc(true)._d), {}, {
                                timezone: false
                            });}else{
                                list_view_data.data_rows[j]["data"][index] = field_utils.format.datetime(moment(moment(date).utc(true)._d), {}, {
                                timezone: false
                            });
                            }

                             }else {
                                list_view_data.data_rows[j]["data"][index] = "";
                            }
                        }
                    }
                }
            }
            if (list_view_data) {
                for (var i = 0; i < list_view_data.data_rows.length; i++) {
                    for (var j = 0; j < list_view_data.data_rows[0]["data"].length; j++) {
                        if (typeof(list_view_data.data_rows[i].data[j]) === "number" || list_view_data.data_rows[i].data[j]) {
                            if (typeof(list_view_data.data_rows[i].data[j]) === "number") {
                                list_view_data.data_rows[i].data[j] = field_utils.format.float(list_view_data.data_rows[i].data[j], Float64Array, {digits:[0,item.lbs_precision_digits]})
                            }
                        } else {
                            list_view_data.data_rows[i].data[j] = "";
                        }
                    }
                }
            }
            var $lbsItemContainer = $(QWeb.render('lbs_list_view_table', {
                list_view_data: list_view_data,
                item_id: item_id,
                list_type: item.lbs_list_view_type,
                isDrill: self.lbs_dashboard_data.lbs_item_data[item_id]['isDrill']
            }));
            self.list_container = $lbsItemContainer;
            if (list_view_data){
                var $lbsitemBody = self.lbsListViewBody(list_view_data,item_id)
                self.list_container.find('.lbs_table_body').append($lbsitemBody)
            }
            if (item.lbs_list_view_type === "ungrouped") {
                $lbsItemContainer.find('.lbs_list_canvas_click').removeClass('lbs_list_canvas_click');
            }

            if (!item.lbs_show_records) {
                $lbsItemContainer.find('#lbs_item_info').hide();
            }
            return $lbsItemContainer
        },

        lbsListViewBody: function(list_view_data, item_id) {
            var self = this;
            var itemid = item_id
            var  data_calculation_type = self.lbs_dashboard_data.lbs_item_data[item_id].data_calculation_type;
            var lbs_list_view_type = self.lbs_dashboard_data.lbs_item_data[item_id].lbs_list_view_type
            var $lbsitemBody = $(QWeb.render('lbs_list_view_tmpl', {
                        list_view_data: list_view_data,
                        item_id: itemid,
                        calculation_type: data_calculation_type,
                        isDrill: self.lbs_dashboard_data.lbs_item_data[item_id]['isDrill'],
                        list_type: lbs_list_view_type,
                    }));
            return $lbsitemBody;

        },

        lbsSum: function(count_1, count_2, item_info, field, target_1, $kpi_preview, kpi_data) {
            var self = this;
            var count = count_1 + count_2;
            if (field.lbs_multiplier_active){
                item_info['count'] = KsGlobalFunction._onKsGlobalFormatter(count* field.lbs_multiplier, field.data_formatting, field.lbs_precision_digits);
                item_info['count_tooltip'] = field_utils.format.float(count * field.lbs_multiplier, Float64Array, {digits:[0,field.lbs_precision_digits]});
            }else{

                item_info['count'] = KsGlobalFunction._onKsGlobalFormatter(count, field.data_formatting, field.lbs_precision_digits);
                item_info['count_tooltip'] = field_utils.format.float(parseFloat(count), Float64Array, {digits:[0,field.lbs_precision_digits]});
            }
             if (field.lbs_multiplier_active){
                count = count * field.lbs_multiplier;
            }
            item_info['target_enable'] = field.lbs_goal_enable;
            var lbs_color = (target_1 - count) > 0 ? "red" : "green";
            item_info.pre_arrow = (target_1 - count) > 0 ? "down" : "up";
            item_info['lbs_comparison'] = true;
            var target_deviation = (target_1 - count) > 0 ? Math.round(((target_1 - count) / target_1) * 100) : Math.round((Math.abs((target_1 - count)) / target_1) * 100);
            if (target_deviation !== Infinity) item_info.target_deviation = field_utils.format.integer(target_deviation) + "%";
            else {
                item_info.target_deviation = target_deviation;
                item_info.pre_arrow = false;
            }
            var target_progress_deviation = target_1 == 0 ? 0 : Math.round((count / target_1) * 100);
            item_info.target_progress_deviation = field_utils.format.integer(target_progress_deviation) + "%";
            $kpi_preview = $(QWeb.render("lbs_kpi_template_2", item_info));
            $kpi_preview.find('.target_deviation').css({
                "color": lbs_color
            });
            if (field.lbs_target_view === "Progress Bar") {
                $kpi_preview.find('#lbs_progressbar').val(target_progress_deviation)
            }

            return $kpi_preview;
        },

        lbsPercentage: function(count_1, count_2, field, item_info, target_1, $kpi_preview, kpi_data) {

            if (field.lbs_multiplier_active){
                count_1 = count_1 * field.lbs_multiplier;
                count_2 = count_2 * field.lbs_multiplier;
            }
            var count = parseInt((count_1 / count_2) * 100);
            if (field.lbs_multiplier_active){
                count = count * field.lbs_multiplier;
            }
            item_info['count'] = count ? field_utils.format.integer(count) + "%" : "0%";
            item_info['count_tooltip'] = count ? count + "%" : "0%";
            item_info.target_progress_deviation = item_info['count']
            target_1 = target_1 > 100 ? 100 : target_1;
            item_info.target = target_1 + "%";
            item_info.pre_arrow = (target_1 - count) > 0 ? "down" : "up";
            var lbs_color = (target_1 - count) > 0 ? "red" : "green";
            item_info['target_enable'] = field.lbs_goal_enable;
            item_info['lbs_comparison'] = false;
            item_info.target_deviation = item_info.target > 100 ? 100 : item_info.target;
            $kpi_preview = $(QWeb.render("lbs_kpi_template_2", item_info));
            $kpi_preview.find('.target_deviation').css({
                "color": lbs_color
            });
            if (field.lbs_target_view === "Progress Bar") {
                if (count) $kpi_preview.find('#lbs_progressbar').val(count);
                else $kpi_preview.find('#lbs_progressbar').val(0);
            }

            return $kpi_preview;
        },

        renderKpi: function(item, grid) {
            var self = this;
            var field = item;
            var date_filter_selection = field.date_filter_selection;
            if (field.date_filter_selection === "l_none") date_filter_selection = self.lbs_dashboard_data.date_filter_selection;
            var lbs_valid_date_selection = ['l_day', 't_week', 't_month', 't_quarter', 't_year'];
            var kpi_data = JSON.parse(field.lbs_kpi_data);
            var count_1 = kpi_data[0].record_data;
            var count_2 = kpi_data[1] ? kpi_data[1].record_data : undefined;
            var target_1 = kpi_data[0].target;
            var lbs_target_view = field.lbs_target_view,
                pre_view = field.lbs_prev_view;
            var lbs_rgba_background_color = self._lbs_get_rgba_format(field.background_color);
            var lbs_rgba_button_color = self._lbs_get_rgba_format(field.lbs_button_color);
            var lbs_rgba_font_color = self._lbs_get_rgba_format(field.lbs_font_color);
            if (field.lbs_goal_enable) {
                var diffrence = 0.0
               if(field.lbs_multiplier_active){
                    diffrence = (count_1 * field.lbs_multiplier) - target_1
                }else{
                    diffrence = count_1 - target_1
                }
                var acheive = diffrence >= 0 ? true : false;
                diffrence = Math.abs(diffrence);
                var deviation = Math.round((diffrence / target_1) * 100)
                if (deviation !== Infinity) deviation = deviation ? field_utils.format.integer(deviation) + '%' : 0 + '%';
            }
            if (field.previous_period && lbs_valid_date_selection.indexOf(date_filter_selection) >= 0) {
                var previous_period_data = kpi_data[0].previous_period;
                var pre_diffrence = (count_1 - previous_period_data);
                if (field.lbs_multiplier_active){
                    var previous_period_data = kpi_data[0].previous_period * field.lbs_multiplier;
                    var pre_diffrence = (count_1 * field.lbs_multiplier   - previous_period_data);
                }
                var pre_acheive = pre_diffrence > 0 ? true : false;
                pre_diffrence = Math.abs(pre_diffrence);
                var pre_deviation = previous_period_data ? field_utils.format.integer(parseInt((pre_diffrence / previous_period_data) * 100)) + '%' : "100%"
            }
            item['lbsIsDashboardManager'] = self.lbs_dashboard_data.lbs_dashboard_manager;
            var lbs_icon_url;
            if (field.icon_select == "Custom") {
                if (field.lbs_icon[0]) {
                    lbs_icon_url = 'data:image/' + (self.file_type_magic_word[field.lbs_icon[0]] || 'png') + ';base64,' + field.lbs_icon;
                } else {
                    lbs_icon_url = false;
                }
            }
//            parseInt(Math.round((count_1 / target_1) * 100)) ? field_utils.format.integer(Math.round((count_1 / target_1) * 100)) : "0"
            var target_progress_deviation = String(Math.round((count_1  / target_1) * 100));
             if(field.lbs_multiplier_active){
                var target_progress_deviation = String(Math.round(((count_1 * field.lbs_multiplier) / target_1) * 100));
             }
            var lbs_rgba_icon_color = self._lbs_get_rgba_format(field.default_icon_color)
            var item_info = {
                item: item,
                id: field.id,
                count_1: KsGlobalFunction.lbsNumFormatter(kpi_data[0]['record_data'], 1),
                count_1_tooltip: kpi_data[0]['record_data'],
                count_2: kpi_data[1] ? String(kpi_data[1]['record_data']) : false,
                name: field.name ? field.name : field.model_id.data.display_name,
                target_progress_deviation:target_progress_deviation,
                icon_select: field.icon_select,
                default_icon: field.default_icon,
                icon_color: lbs_rgba_icon_color,
                target_deviation: deviation,
                target_arrow: acheive ? 'up' : 'down',
                lbs_enable_goal: field.lbs_goal_enable,
                previous_period: lbs_valid_date_selection.indexOf(date_filter_selection) >= 0 ? field.previous_period : false,
                target: KsGlobalFunction.lbsNumFormatter(target_1, 1),
                previous_period_data: previous_period_data,
                pre_deviation: pre_deviation,
                pre_arrow: pre_acheive ? 'up' : 'down',
                lbs_target_view: field.lbs_target_view,
                pre_view: field.lbs_prev_view,
                lbs_dashboard_list: self.lbs_dashboard_data.lbs_dashboard_list,
                lbs_icon_url: lbs_icon_url,
                lbs_rgba_button_color:lbs_rgba_button_color,

            }

            if (item_info.target_deviation === Infinity) item_info.target_arrow = false;
            item_info.target_progress_deviation = parseInt(item_info.target_progress_deviation) ? field_utils.format.integer(parseInt(item_info.target_progress_deviation)) : "0"
            if (field.lbs_multiplier_active){
                item_info['count_1'] = KsGlobalFunction._onKsGlobalFormatter(kpi_data[0]['record_data'] * field.lbs_multiplier, field.data_formatting, field.lbs_precision_digits);
                item_info['count_1_tooltip'] = kpi_data[0]['record_data'] * field.lbs_multiplier
            }else{
                item_info['count_1'] = KsGlobalFunction._onKsGlobalFormatter(kpi_data[0]['record_data'], field.data_formatting, field.lbs_precision_digits);
            }
            item_info['target'] = KsGlobalFunction._onKsGlobalFormatter(kpi_data[0].target, field.data_formatting, field.lbs_precision_digits);
            var $kpi_preview;
            if (!kpi_data[1]) {
                if (field.lbs_target_view === "Number" || !field.lbs_goal_enable) {
                    $kpi_preview = $(QWeb.render("lbs_kpi_template", item_info));
                } else if (field.lbs_target_view === "Progress Bar" && field.lbs_goal_enable) {
                    $kpi_preview = $(QWeb.render("lbs_kpi_template_3", item_info));
                    $kpi_preview.find('#lbs_progressbar').val(parseInt(item_info.target_progress_deviation));

                }

                if (field.lbs_goal_enable) {
                    if (acheive) {
                        $kpi_preview.find(".target_deviation").css({
                            "color": "green",
                        });
                    } else {
                        $kpi_preview.find(".target_deviation").css({
                            "color": "red",
                        });
                    }
                }
                if (field.previous_period && String(previous_period_data) && lbs_valid_date_selection.indexOf(date_filter_selection) >= 0) {
                    if (pre_acheive) {
                        $kpi_preview.find(".pre_deviation").css({
                            "color": "green",
                        });
                    } else {
                        $kpi_preview.find(".pre_deviation").css({
                            "color": "red",
                        });
                    }
                }
                if ($kpi_preview.find('.lbs_target_previous').children().length !== 2) {
                    $kpi_preview.find('.lbs_target_previous').addClass('justify-content-center');
                }
            } else {
                switch (field.lbs_data_comparison) {
                    case "None":
                        if (field.lbs_multiplier_active){
                            var count_tooltip = String(count_1 * field.lbs_multiplier) + "/" + String(count_2 * field.lbs_multiplier);
                            var count = String(KsGlobalFunction.lbsNumFormatter(count_1 * field.lbs_multiplier, 1)) + "/" + String(KsGlobalFunction.lbsNumFormatter(count_2 * field.lbs_multiplier, 1));
                            item_info['count'] = String(KsGlobalFunction._onKsGlobalFormatter(count_1 * field.lbs_multiplier, field.data_formatting, field.lbs_precision_digits)) + "/" + String(KsGlobalFunction._onKsGlobalFormatter(count_2 * field.lbs_multiplier, field.data_formatting, field.lbs_precision_digits));
                         }else{
                            var count_tooltip = String(count_1) + "/" + String(count_2);
                            var count = String(KsGlobalFunction.lbsNumFormatter(count_1, 1)) + "/" + String(KsGlobalFunction.lbsNumFormatter(count_2, 1));
                            item_info['count'] = String(KsGlobalFunction._onKsGlobalFormatter(count_1, field.data_formatting, field.lbs_precision_digits)) + "/" + String(KsGlobalFunction._onKsGlobalFormatter(count_2, field.data_formatting, field.lbs_precision_digits));
                         }
                        item_info['count_tooltip'] = count_tooltip;

                        item_info['target_enable'] = false;
                        $kpi_preview = $(QWeb.render("lbs_kpi_template_2", item_info));
                        break;
                    case "Sum":
                        $kpi_preview = self.lbsSum(count_1, count_2, item_info, field, target_1, $kpi_preview, kpi_data);
                        break;
                    case "Percentage":
                        $kpi_preview = self.lbsPercentage(count_1, count_2, field, item_info, target_1, $kpi_preview, kpi_data);
                        break;
                    case "Ratio":
                        var gcd = self.lbs_get_gcd(Math.round(count_1), Math.round(count_2));
                        if (item.data_formatting == 'exact'){
                            if (count_1 && count_2) {
                            item_info['count_tooltip'] = count_1 / gcd + ":" + count_2 / gcd;
                            item_info['count'] = field_utils.format.float(count_1 / gcd, Float64Array,{digits: [0, field.lbs_precision_digits]}) + ":" + field_utils.format.float(count_2 / gcd, Float64Array, {digits: [0, field.lbs_precision_digits]});
                            } else {
                            item_info['count_tooltip'] = count_1 + ":" + count_2;
                            item_info['count'] = count_1 + ":" + count_2
                                   }
                          }else{
                            if (count_1 && count_2) {
                            item_info['count_tooltip'] = count_1 / gcd + ":" + count_2 / gcd;
                            item_info['count'] = KsGlobalFunction.lbsNumFormatter(count_1 / gcd, 1) + ":" + KsGlobalFunction.lbsNumFormatter(count_2 / gcd, 1);
                            }else {
                            item_info['count_tooltip'] = (count_1) + ":" + count_2;
                            item_info['count'] = KsGlobalFunction.lbsNumFormatter(count_1, 1) + ":" + KsGlobalFunction.lbsNumFormatter(count_2, 1);
                                  }
                          }
                        item_info['target_enable'] = false;
                        $kpi_preview = $(QWeb.render("lbs_kpi_template_2", item_info));
                        break;
                }
            }
            $kpi_preview.find('.lbs_dashboarditem_id').css({
                "background-color": lbs_rgba_background_color,
                "color": lbs_rgba_font_color,
            });
            return $kpi_preview

        },

        lbs_get_gcd: function(a, b) {
            return (b == 0) ? a : this.lbs_get_gcd(b, a % b);
        },

        _onKsInputChange: function(e) {
            this.lbsNewDashboardName = e.target.value
        },

        onKsDuplicateItemClick: function(e) {
            var self = this;
            var lbs_item_id = $($(e.target).parentsUntil(".lbs_dashboarditem_id").slice(-1)[0]).parent().attr('id');
            var dashboard_id = $($(e.target).parentsUntil(".lbs_dashboarditem_id").slice(-1)[0]).find('.lbs_dashboard_select').val();
            var dashboard_name = $($(e.target).parentsUntil(".lbs_dashboarditem_id").slice(-1)[0]).find('.lbs_dashboard_select option:selected').text();
            this._rpc({
                model: 'lbs.dashboard_items',
                method: 'copy',
                args: [parseInt(lbs_item_id), {
                    'dashboard_lbs_board_id': parseInt(dashboard_id)
                }],
            }).then(function(result) {
                self.displayNotification({
                    title:_t("Item Duplicated"),
                    message:_t('Selected item is duplicated to ' + dashboard_name + ' .'),
                    type: 'success',
                });
                $.when(self.lbs_fetch_data()).then(function () {
                    self.lbs_fetch_items_data().then(function (){
                        self.lbsRenderDashboard();
                    });
                });
            })
        },

        lbsOnListItemInfoClick: function(e) {
            var self = this;
            var item_id = e.currentTarget.dataset.itemId;
            var item_data = self.lbs_dashboard_data.lbs_item_data[item_id];
            var action = {
                name: _t(item_data.name),
                type: 'ir.actions.act_window',
                res_model: e.currentTarget.dataset.model,
                domain: item_data.lbs_domain || [],
                views: [
                    [false, 'list'],
                    [false, 'form']
                ],
                target: 'current',
            }
            if (e.currentTarget.dataset.listViewType === "ungrouped") {
                action['view_mode'] = 'form';
                action['views'] = [
                    [false, 'form']
                ];
                action['res_id'] = parseInt(e.currentTarget.dataset.recordId);
            } else {
                if (e.currentTarget.dataset.listType === "date_type") {
                    var domain = JSON.parse(e.currentTarget.parentElement.parentElement.dataset.domain);
                    action['view_mode'] = 'list';
                    action['context'] = {
                        'group_by': e.currentTarget.dataset.groupby,
                    };
                    action['domain'] = domain;
                } else if (e.currentTarget.dataset.listType === "relational_type") {
                    var domain = JSON.parse(e.currentTarget.parentElement.parentElement.dataset.domain);
                    action['view_mode'] = 'list';
                    action['context'] = {
                        'group_by': e.currentTarget.dataset.groupby,
                    };
                    action['domain'] = domain;
                    action['context']['search_default_' + e.currentTarget.dataset.groupby] = parseInt(e.currentTarget.dataset.recordId);
                } else if (e.currentTarget.dataset.listType === "other") {
                    var domain = JSON.parse(e.currentTarget.parentElement.parentElement.dataset.domain);
                    action['view_mode'] = 'list';
                    action['context'] = {
                        'group_by': e.currentTarget.dataset.groupby,
                    };
                    action['context']['search_default_' + e.currentTarget.dataset.groupby] = parseInt(e.currentTarget.dataset.recordId);
                    action['domain'] = domain;
                }
            }
            self.do_action(action, {
                on_reverse_breadcrumb: this.on_reverse_breadcrumb,
            });
        },

        onKsMoveItemClick: function(e) {
            var self = this;
            var lbs_item_id = $($(e.target).parentsUntil(".lbs_dashboarditem_id").slice(-1)[0]).parent().attr('id');
            var dashboard_id = $($(e.target).parentsUntil(".lbs_dashboarditem_id").slice(-1)[0]).find('.lbs_dashboard_select').val();
            var dashboard_name = $($(e.target).parentsUntil(".lbs_dashboarditem_id").slice(-1)[0]).find('.lbs_dashboard_select option:selected').text();
            this._rpc({
                model: 'lbs.dashboard_items',
                method: 'write',
                args: [parseInt(lbs_item_id), {
                    'dashboard_lbs_board_id': parseInt(dashboard_id)
                }],
            }).then(function(result) {
                self.displayNotification({
                    title:_t("Item Moved"),
                    message:_t('Selected item is moved to ' + dashboard_name + ' .'),
                    type: 'success',
                });
                $.when(self.lbs_fetch_data()).then(function() {
                    $.when(self.lbs_fetch_items_data()).then(function(){
                        self.lbs_remove_update_interval();
                        self.lbsRenderDashboard();
                        self.lbs_set_update_interval();
                    });
                });
            });
        },

        _KsGetDateValues: function() {
            var self = this;

            //Setting Date Filter Selected Option in Date Filter DropDown Menu
            var date_filter_selected = self.lbs_dashboard_data.date_filter_selection;
            if (self.lbsDateFilterSelection == 'l_none'){
                    date_filter_selected = self.lbsDateFilterSelection;
            }
            self.$el.find('#' + date_filter_selected).addClass("lbs_date_filter_selected");
            self.$el.find('#date_filter_selection').text(self.lbs_date_filter_selections[date_filter_selected]);

            if (self.lbs_dashboard_data.date_filter_selection === 'l_custom') {
                self.$el.find('.lbs_date_input_fields').removeClass("lbs_hide");
                self.$el.find('.lbs_date_filter_dropdown').addClass("lbs_btn_first_child_radius");
            } else if (self.lbs_dashboard_data.date_filter_selection !== 'l_custom') {
                self.$el.find('.lbs_date_input_fields').addClass("lbs_hide");
            }
        },

        _onKsClearDateValues: function(lbs_l_none=false) {
            var self = this;
            self.lbsDateFilterSelection = 'l_none';
            self.lbsDateFilterStartDate = false;
            self.lbsDateFilterEndDate = false;

            self.lbs_fetch_items_data().then(function () {
                self.lbsRenderDashboard();
                $('.lbs_date_input_fields').addClass("lbs_hide");
                $('.lbs_date_filter_dropdown').removeClass("lbs_btn_first_child_radius");
//                  self.ksUpdateDashboardItem()
           });

        },


        _renderDateFilterDatePicker: function() {
            var self = this;
            self.$el.find(".lbs_dashboard_link").removeClass("lbs_hide");
            var startDate = self.lbs_dashboard_data.dashboard_start_date ? moment.utc(self.lbs_dashboard_data.dashboard_start_date).local() : moment();
            var endDate = self.lbs_dashboard_data.dashboard_end_date ? moment.utc(self.lbs_dashboard_data.dashboard_end_date).local() : moment();

            this.lbsStartDatePickerWidget = new(datepicker.DateTimeWidget)(this);

            this.lbsStartDatePickerWidget.appendTo(self.$el.find(".lbs_date_input_fields")).then((function() {
                this.lbsStartDatePickerWidget.$el.addClass("lbs_btn_middle_child o_input");
                this.lbsStartDatePickerWidget.$el.find("input").attr("placeholder", "Start Date");
                this.lbsStartDatePickerWidget.setValue(startDate);
                this.lbsStartDatePickerWidget.on("datetime_changed", this, function() {
                    self.$el.find(".apply-dashboard-date-filter").removeClass("lbs_hide");
                    self.$el.find(".clear-dashboard-date-filter").removeClass("lbs_hide");
                });
            }).bind(this));

            this.lbsEndDatePickerWidget = new(datepicker.DateTimeWidget)(this);
            this.lbsEndDatePickerWidget.appendTo(self.$el.find(".lbs_date_input_fields")).then((function() {
                this.lbsEndDatePickerWidget.$el.addClass("lbs_btn_last_child o_input");
                this.lbsStartDatePickerWidget.$el.find("input").attr("placeholder", "Start Date");
                this.lbsEndDatePickerWidget.setValue(endDate);
                this.lbsEndDatePickerWidget.on("datetime_changed", this, function() {
                    self.$el.find(".apply-dashboard-date-filter").removeClass("lbs_hide");
                    self.$el.find(".clear-dashboard-date-filter").removeClass("lbs_hide");
                });
            }).bind(this));

            self._KsGetDateValues();
        },

        _onKsApplyDateFilter: function(e) {
            var self = this;
            var start_date = self.lbsStartDatePickerWidget.$input.val();
            var end_date = self.lbsEndDatePickerWidget.$input.val();
            if (start_date === "Invalid date") {
                alert("Invalid Date is given in Start Date.")
            } else if (end_date === "Invalid date") {
                alert("Invalid Date is given in End Date.")
            } else if (self.$el.find('.lbs_date_filter_selected').attr('id') !== "l_custom") {

                self.lbsDateFilterSelection = self.$el.find('.lbs_date_filter_selected').attr('id');

                self.lbs_fetch_items_data().then(function(result){
                    self.lbsUpdateDashboardItem(Object.keys(self.lbs_dashboard_data.lbs_item_data));
                    self.$el.find(".apply-dashboard-date-filter").addClass("lbs_hide");
                    self.$el.find(".clear-dashboard-date-filter").addClass("lbs_hide");
                });
            } else {
                if (start_date && end_date) {
                    if (moment(start_date, self.datetime_format) <= moment(end_date, self.datetime_format)) {
                        var start_date = new moment(start_date, self.datetime_format).format("YYYY-MM-DD H:m:s");
                        var end_date = new moment(end_date, self.datetime_format).format("YYYY-MM-DD H:m:s");
                        if (start_date === "Invalid date" || end_date === "Invalid date"){
                            alert(_t("Invalid Date"));
                        }else{
                            self.lbsDateFilterSelection = self.$el.find('.lbs_date_filter_selected').attr('id');
                            self.lbsDateFilterStartDate = start_date;
                            self.lbsDateFilterEndDate = end_date;

                            self.lbs_fetch_items_data().then(function(result){
                                self.lbsUpdateDashboardItem(Object.keys(self.lbs_dashboard_data.lbs_item_data));
                                self.$el.find(".apply-dashboard-date-filter").addClass("lbs_hide");
                                self.$el.find(".clear-dashboard-date-filter").addClass("lbs_hide");
                            });
                       }

                    } else {
                        alert(_t("Start date should be less than end date"));
                    }
                } else {
                    alert(_t("Please enter start date and end date"));
                }
            }
        },

        _lbsOnDateFilterMenuSelect: function(e) {
            if (e.target.id !== 'lbs_date_selector_container') {
                var self = this;
                _.each($('.lbs_date_filter_selected'), function($filter_options) {
                    $($filter_options).removeClass("lbs_date_filter_selected")
                });
                $(e.target.parentElement).addClass("lbs_date_filter_selected");
                $('#date_filter_selection').text(self.lbs_date_filter_selections[e.target.parentElement.id]);

                if (e.target.parentElement.id !== "l_custom") {
                    e.target.parentElement.id === "l_none" ?  self._onKsClearDateValues(true) : self._onKsApplyDateFilter();
                    $('.lbs_date_input_fields').addClass("lbs_hide");
                    $('.lbs_date_filter_dropdown').removeClass("lbs_btn_first_child_radius");

                } else if (e.target.parentElement.id === "l_custom") {
                    $("#lbs_start_date_picker").val(null).removeClass("lbs_hide");
                    $("#lbs_end_date_picker").val(null).removeClass("lbs_hide");
                    $('.lbs_date_input_fields').removeClass("lbs_hide");
                    $('.lbs_date_filter_dropdown').addClass("lbs_btn_first_child_radius");
                    self.$el.find(".apply-dashboard-date-filter").removeClass("lbs_hide");
                    self.$el.find(".clear-dashboard-date-filter").removeClass("lbs_hide");
                }
            }
        },

        lbsChartExportXlsCsv: function(e) {
            var chart_id = e.currentTarget.dataset.chartId;
            var name = this.lbs_dashboard_data.lbs_item_data[chart_id].name;
            var context = this.getContext();
            if (this.lbs_dashboard_data.lbs_item_data[chart_id].dashboard_item_type === 'lbs_list_view'){
             var params = this.lbsGetParamsForItemFetch(parseInt(chart_id));
            var data = {
                "header": name,
                "chart_data": this.lbs_dashboard_data.lbs_item_data[chart_id].lbs_list_view_data,
                "lbs_item_id": chart_id,
                "lbs_export_boolean": true,
                "context": context,
                'params':params,
            }
            }else{
                var data = {
                    "header": name,
                    "chart_data": this.lbs_dashboard_data.lbs_item_data[chart_id].lbs_chart_data,
            }
            }

            framework.blockUI();
            this.getSession().get_file({
                url: '/lbs_dashboard/export/' + e.currentTarget.dataset.format,
                data: {
                    data: JSON.stringify(data)
                },
                complete: framework.unblockUI,
                error: (error) => this.call('crash_manager', 'rpc_error', error),
            });
        },

        lbsChartExportPdf : function(e){
            var self = this;
            var chart_id = e.currentTarget.dataset.chartId;
            var name = this.lbs_dashboard_data.lbs_item_data[chart_id].name;
            var base64_image = this.chart_container[chart_id].toBase64Image();
            var $lbs_el = $($(self.$el.find(".grid-stack-item[gs-id=" + chart_id + "]")).find('.lbs_chart_card_body'));
            var lbs_height = $lbs_el.height()
           var lbs_image_def = {
	            content: [{
                        image: base64_image,
                        width: 500,
                        height: lbs_height,
                        }],
                images: {
                    bee: base64_image
                }
            };
             pdfMake.createPdf(lbs_image_def).download(name + '.pdf');
        },

        lbsItemExportJson: function(e) {
            var itemId = $(e.target).parents('.lbs_dashboard_item_button_container')[0].dataset.item_id;
            var name = this.lbs_dashboard_data.lbs_item_data[itemId].name;
            var data = {
                'header': name,
                item_id: itemId,
            }
            framework.blockUI();
            this.getSession().get_file({
                url: '/lbs_dashboard/export/item_json',
                data: {
                    data: JSON.stringify(data)
                },
                complete: framework.unblockUI,
                error: (error) => this.call('crash_manager', 'rpc_error', error),
            });
            e.stopPropagation();
        },

        //List View pagination records
        lbsLoadMoreRecords: function(e) {
            var self = this;
            var lbs_intial_count = e.target.parentElement.dataset.prevOffset;
            var lbs_offset = e.target.parentElement.dataset.next_offset;
            var itemId = e.currentTarget.dataset.itemId;
            var offset = self.lbs_dashboard_data.lbs_item_data[itemId].lbs_pagination_limit;

            if (itemId in self.lbsUpdateDashboard) {
                clearInterval(self.lbsUpdateDashboard[itemId])
                delete self.lbsUpdateDashboard[itemId];
            }
            var params = self.lbsGetParamsForItemFetch(parseInt(itemId));
            this._rpc({
                model: 'lbs.dashboard',
                method: 'lbs_get_list_view_data_offset',
                context: self.getContext(),
                args: [parseInt(itemId), {
                    lbs_intial_count: lbs_intial_count,
                    offset: lbs_offset,
                    }, parseInt(self.lbs_dashboard_id), params],
            }).then(function(result) {
                var item_data = self.lbs_dashboard_data.lbs_item_data[itemId];
                self.lbs_dashboard_data.lbs_item_data[itemId]['lbs_list_view_data'] = result.lbs_list_view_data;
                var item_view = self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]");
                item_view.find('.card-body').empty();
                item_view.find('.card-body').append(self.renderListViewData(item_data));
                $(e.currentTarget).parents('.lbs_pager').find('.lbs_value').text(result.offset + "-" + result.next_offset);
                e.target.parentElement.dataset.next_offset = result.next_offset;
                e.target.parentElement.dataset.prevOffset = result.offset;
                $(e.currentTarget.parentElement).find('.lbs_load_previous').removeClass('lbs_event_offer_list');
                if (result.next_offset < parseInt(result.offset) + (offset - 1) || result.next_offset == item_data.lbs_record_count || result.next_offset === result.limit){
                    $(e.currentTarget).addClass('lbs_event_offer_list');
                }
            });
        },

        lbsLoadPreviousRecords: function(e) {
            var self = this;
            var itemId = e.currentTarget.dataset.itemId;
            var offset = self.lbs_dashboard_data.lbs_item_data[itemId].lbs_pagination_limit;
            var lbs_offset =  parseInt(e.target.parentElement.dataset.prevOffset) - (offset + 1) ;
            var lbs_intial_count = e.target.parentElement.dataset.next_offset;
            if (lbs_offset <= 0) {
                var updateValue = self.lbs_dashboard_data.lbs_item_data[itemId]["update_items_data"];
                if (updateValue) {
                    var updateinterval = setInterval(function() {
                        self.lbsFetchUpdateItem(itemId)
                    }, updateValue);
                    self.lbsUpdateDashboard[itemId] = updateinterval;
                }
            }
            var params = self.lbsGetParamsForItemFetch(parseInt(itemId));
            this._rpc({
                model: 'lbs.dashboard',
                method: 'lbs_get_list_view_data_offset',
                context: self.getContext(),
                args: [parseInt(itemId), {
                    lbs_intial_count: lbs_intial_count,
                    offset: lbs_offset,
                    }, parseInt(self.lbs_dashboard_id), params],
            }).then(function(result) {
                var item_data = self.lbs_dashboard_data.lbs_item_data[itemId];
                self.lbs_dashboard_data.lbs_item_data[itemId]['lbs_list_view_data'] = result.lbs_list_view_data;
                var item_view = self.$el.find(".grid-stack-item[gs-id=" + item_data.id + "]");
                item_view.find('.card-body').empty();
                item_view.find('.card-body').append(self.renderListViewData(item_data));
                $(e.currentTarget).parents('.lbs_pager').find('.lbs_value').text(result.offset + "-" + result.next_offset);
                e.target.parentElement.dataset.next_offset = result.next_offset;
                e.target.parentElement.dataset.prevOffset = result.offset;
                $(e.currentTarget.parentElement).find('.lbs_load_next').removeClass('lbs_event_offer_list');
                if (result.offset === 1) {
                    $(e.currentTarget).addClass('lbs_event_offer_list');
                }
            });
        },

    });

    core.action_registry.add('lbs_dashboard', KsDashboardNinja);

    patch(WebClient.prototype, 'lbs_dn.WebClient', {
        async loadRouterState(...args) {
            var self = this;
            const sup = await this._super(...args);
            const lbs_reload_menu = async (id) =>  {
                this.menuService.reload().then(() => {
                      self.menuService.selectMenu(id);
                  });
            }
            this.actionService.lbsDnReloadMenu = lbs_reload_menu;
            return sup;
        }

    });

    return KsDashboardNinja;
});