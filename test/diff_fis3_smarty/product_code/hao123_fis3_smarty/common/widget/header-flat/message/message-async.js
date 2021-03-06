var $ = require("common:widget/ui/jquery/jquery.js");
var Helper = require("common:widget/ui/helper/helper.js");
var Md5 = require('common:widget/ui/md5/md5.js');
var UT = require("common:widget/ui/ut/ut.js");

/*****************************
消息盒子
------------------------------
MRD地址：http://10.65.211.71:8200/doc/61aa0959-2f0b-4761-8073-41455e74e7ae
------------------------------
可传入的参数说明
	apiUrlPrefix：API请求的前缀
	apiUrlParam：API请求的参数
	noMsgContent：无消息时显示的文本
	maxNumber：消息数的最大值
	msgLineHeight：每条消息的最大显示高度（溢出省略）

*****************************/
var Message = function(userOption){
	var defaultOption = {
		records: [],
		deletedIds: [],
		clickedIds: [],
		hasBubble: false,
		htmlTpl: '<li class="#{class} cf" data-id="#{id}">'
				+ '<#{tagName} #{attrs} class="message-target" data-sort="msgcontent" data-val="#{id}">'
				+ 	'<i class="ico-message-type ico-message-type#{type}"></i>'
				+	'<span>#{description}</span>'
				+ '</#{tagName}>'
				+ '<a href="javascript:;" class="ico-message-delete" data-sort="msgdelete" data-val="#{id}"></a>'
				+'</li>',
	    htmlShopTpl: '<li class="#{class} cf" data-id="#{id}">'
				+ '<a href="#{target}" target="_blank" class="message-target" data-sort="msgcontent" data-val="#{id}">'
				+ 	'<img class="ico-shop" src="#{imgUrl}">'
				+	'<div class="ico-des text-overflow-block"><p>#{description}&nbsp;&nbsp;<i class="ico-price">#{price}</i></p></div>'
				+ '</a>'
				+ '<span class="ico-fur">#{supplier} | <span>#{timestamp}</span></span>'
				+ '<a class="ico-more" href="#{submitUrl}">#{submit}</a>'
				+ '<a href="javascript:;" class="ico-message-delete" data-sort="msgdelete" data-val="#{id}"></a>'
				+'</li>',
		apiUrlPrefix: conf.apiUrlPrefix,
		apiUrlParam: "?app=msgbox&act=contents&num=5&country=" + conf.country,
		noMsgContent: "There is no message.",
		maxNumber: 5,
		msgLineHeight: 30,
		_callbacks: {}
	}
	$.extend(this, defaultOption, userOption);
};

Message.prototype = {

	constructor: Message,

	//模型绑定事件
	bind: function(ev, callback){
		(this._callbacks[ev] || (this._callbacks[ev] = [])).push(callback);
	},

	//触发模型事件
	trigger: function(ev){
		var callbacks;
		if (!(callbacks = this._callbacks[ev])) {
			return this;
		}
		$.each(callbacks, function(){
			this();
		});
	},

	/*新增消息（暂时无用）
	addRecord: function(message){
		if (this.records.length < this.maxNumber) {
			this.records.push(message);
			this.trigger("change");
		}
	},*/

	//删除消息
	delRecord: function(delId){
		var locRecords = this.records;
		var matchIndex;
		for(matchIndex=0; matchIndex<locRecords.length; matchIndex++){
			if (delId == locRecords[matchIndex].id) {
				break;
			}
			if (!conf.msgBoxShop && (matchIndex+1 == this.maxNumber)) {
				return;
			}
		}
		this.records.splice(matchIndex, 1);
		this.addDelId(delId);
		this.trigger("change");
	},

	//过滤需要展示的消息（去除被删除的id）
	filterRecord: function(){
		var deletedIds = this.deletedIds;
		for(var i=0; i<deletedIds.length; i++){
			this.delRecord(deletedIds[i]);
		}
	},

	//添加被删除ID
	addDelId: function(id){
		this.addOneId(id, "deletedIds", "msgDelIds");
	},

	//初始化被删除ID
	initDelId: function(){
		var delIdsCookie = $.store("msgDelIds");
		if (delIdsCookie) {
			this.deletedIds = delIdsCookie.split("|");
		}
	},

	//添加被点击ID
	addClickedId: function(id){
		this.addOneId(id, "clickedIds", "msgClickedIds");
	},

	//初始化被点击ID
	initClkId: function(){
		var clickedIdsCookie = $.store("msgClickedIds");
		if (clickedIdsCookie) {
			this.clickedIds = clickedIdsCookie.split("|");
		}
	},

	//添加ID的通用方法
	addOneId: function(id, name, storeName){
		var ids = this[name];
		if ($.inArray(id, ids) >= 0) {
			return;
		}
		var storeIds = $.store(storeName);
		if (storeIds) {
			if (!conf.msgBoxShop && (ids.length >= this.maxNumber)) {
				var minIndex = 0;
				for(var i=1; i<ids.length; i++){
					if (parseInt(ids[i].id, 10) < parseInt(ids[minIndex].id, 10)) {
						minIndex = i;
					}
				}
				this[name].splice(minIndex, 1);
				storeIds = this[name].join("|");
			}
			$.store(storeName, storeIds + "|" + id, {expires: 30});
		}else{
			$.store(storeName, id, {expires: 30});
		}
		this[name].push(id);
		this.trigger("change");
	},

	//更新HTML
	updateTpl: function(){
		var messages = this.records;
		var content = "";
		if (!messages.length) {
			content = "<li class='message-no-item'><span>" + this.noMsgContent + "</span></li>";
		}else{
			var clickedIds = this.clickedIds;
			for(var i=0; i<messages.length; i++){
				var message = messages[i];
				if(!message.type) {
					message["submitUrl"] = message["submitUrl"] || message["target"];
					message["submit"] = message["submit"] || this.submitWord;
					content += Helper.replaceTpl(this.htmlShopTpl, $.extend(message, {
						"class": $.inArray(message.id + '', clickedIds) >= 0 ? "message-over-item" : ""
					}));
					continue;
				}
				if( message.type == "3" ){
					message.tagName = "span";
					message.attrs = "";
				}else{
					message.tagName = "a";
					message.attrs = "href=" + message.target + " target='_blank'";
				}
				content += Helper.replaceTpl(this.htmlTpl, $.extend(message, {
					"class": $.inArray(message.id + '', clickedIds) >= 0 ? "message-over-item" : ""
				}));
			}
		}
		this.contentWrap.find("ul").empty().append(content);
		// this.linesEllipsis(this.contentWrap.find("li a span"));
	},
	
	//多行的溢出省略（工具函数）
	// linesEllipsis: function(jqDom){
	// 	var self = this;
	// 	jqDom.each(function(i){
	// 		var jqThis = $(this);
	// 	    while (jqThis.outerHeight() > self.msgLineHeight) {
	// 	        jqThis.text(jqThis.text().replace(/(\s)*([a-zA-Z0-9]+|\W)(\.\.\.)?$/, "..."));
	// 	    }
	// 	});
	// },

	//定义一些需要用到的变量
	defineVar: function(){
		this.newIcon = $(".ico-message-new");
		this.messageBox = $(".box-message");
		this.contentWrap = $(".wrap-message-content");
		this.lastTimestamp = parseInt($.store("msgTimestamp") || 0, 10);
	},

	//事件绑定
	bindEvent: function(){
		var self = this;
		this.messageBox.one("mouseenter", function(){
			self.trigger("change");
			self.newIcon.addClass("hide");
			$.store("msgHoverd", self.ver || "1", {expires: 30});
		});
		this.bind("change", $.proxy(this.updateTpl, this));
		$(document.body).on("click", function(e){
			var target = $(e.target),
				messageTarget = target.closest(".message-target");
			if(target.hasClass("ico-message-delete")){
				var id = target.parent().attr("data-id");
				self.delRecord(id);
				e.preventDefault();
			}else if(messageTarget.length>0 && messageTarget.is("a") && !target.closest("li").hasClass("message-over-item")){
				var id= target.closest("li").attr("data-id");
				self.addClickedId(id);
			}
		});
		// 对不是a链接的消息，使其hover之后就变灰
		this.messageBox.on("mouseenter", ".account-dropdown_wrap li", function(e){
			// 保证已经初始化了DOM
			// self.trigger("change");
			var target = $(e.target),
				messageTarget = target.closest("li");
			if(messageTarget.find(".message-target").is("span") && !target.closest("li").hasClass("message-over-item")){
				var id= target.closest("li").attr("data-id");
				// 将hover统一当作click，统一效果（可能不是很符合语义，升级带来的问题）
				self.addClickedId(id);
				self.trigger( "change" );
			}
		});

		if(conf.msgBoxShop) {
			this.messageBox
			.on("click", ".message-target", function(e) {
				UT.send({
					modId: "msgbox",
					type: "click",
					sort: self.hasBubble ? "hasBubble" : "noBubble",
					position: (window["loginCtroller"] && loginCtroller.verify == 1) ? "logged": "nolog"
				});
				UT.send({
					modId: "msgbox",
					type: "click",
					position: "content"
				});
			})
			.on("click", ".ico-more", function(e) {
				UT.send({
					modId: "msgbox",
					type: "click",
					sort: self.hasBubble ? "hasBubble" : "noBubble",
					position: (window["loginCtroller"] && loginCtroller.verify == 1) ? "logged": "nolog"
				});
				UT.send({
					modId: "msgbox",
					type: "click",
					position: "button"
				});
			})
			.on("click", ".ico-message-delete", function(e) {
				UT.send({
					modId: "msgbox",
					type: "click",
					position: "delete"
				});
			});
		}
	},

	calculateTipNumber: function(ver) {
		var data = this.records;
		var _del = $.store("msgDelIds");
		var len = 0;
		var _bool = false;

		_del = _del && _del.split("|");
		for(var i = 0, l = data.length; i < l; i++) {
			if(parseInt(data[i]["version"], 10) > ver) {
				if(_del) {
					$.each(_del, function(index, value) {
						if(value == data[i]["id"]) {
							_bool = true;
							return false;
						}
					});
					if(!_bool) {
						++len;
					}
					_bool = false;
				} else {
					++len;
				}
			}
		}
		if(len) {
			this.newIcon.html(len > 99 ? "...": len).removeClass("hide");
			this.hasBubble = true;
		}
	},

	//是否有新消息的判断
	judgeFresh: function(timestamp){
		if (conf.msgBoxShop) {
			timestamp = parseInt(timestamp, 10);
			this.ver = timestamp;
		}
		var hoverdCookie = $.store("msgHoverd");
		var timeCookie = this.lastTimestamp;
		if (timestamp > timeCookie || (timestamp == timeCookie && !hoverdCookie) || (conf.msgBoxShop && hoverdCookie != timestamp)) {
			UT.send({
				modId: "msgbox",
				type: "others",
				sort: "show",
				position: "newicon"
			});
			if(conf.msgBoxShop) {
				this.calculateTipNumber(parseInt(hoverdCookie, 10)||0);
			} else {
				this.newIcon.removeClass("hide");
			}
		}
		$.store("msgTimestamp", timestamp, {expires: 30});
	},

	addScrollBar: function() {
		var that = this;
		require.async("common:widget/ui/scrollable/scrollable.js", function(scrollObj) {
			that.contentWrap.find("ul").scrollable();
		});
	},
	//消息数据的请求
	ajaxLoad: function(){
		var self = this;
		
		var _data = conf.msgBoxShop;
		var content = _data? _data.content: null;
		if(content) {
			if (content.data.length) {
				self.submitWord = _data.submitWord;
				self.records = content.data;
				self.judgeFresh(_data.version);
				self.filterRecord();
				self.addScrollBar();
			}
			return;
		} 

		var apiUrl = this.apiUrlPrefix + this.apiUrlParam;
		$.ajax({
			// test
			// url : "/static/web/message.json",
			// dataType : "json",
			// cache : true,
			url: apiUrl,
			dataType: "jsonp",
			jsonp: "jsonp",
			jsonpCallback: "ghao123_" + Md5(this.apiUrlParam, 16),
			cache: false,
			success: function(data){
				var content = data.content;
				if (content.data.length) {
					self.judgeFresh(content.data[0].timestamp);
					self.records = content.data;
					self.filterRecord();
				}
			}
		});
	},

	//初始化
	init: function(){
		this.defineVar();
		this.bindEvent();
		this.initDelId();
		this.initClkId();
		this.ajaxLoad();
	}
};

module.exports = Message;
