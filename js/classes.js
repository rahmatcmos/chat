var Chat = {
/*  sessionId = '',
 */
	tabActive : true, 
	tabTitle : 'Chat - Owncloud',
	ui : {
    	clear : function(){
    		$('.panel').hide();
    	},
    	markConvActive : function(convId){
    		$('.conv-list-item').removeClass('conv-list-active');
    		$('#conv-list-' + convId).addClass('conv-list-active');
		},
    	scrollDown : function(){
    		$('#chat-window-body').scrollTop($('#chat-window-body')[0].scrollHeight);
    	},
    	showLoading : function(){
    		$('#loading-panel').show();
    	}, 
    	showEmpty : function(){
    		$('#empty-panel').show();
    		this.focus('#empty-panel-new-conv');
    	},
    	showChat : function(){
    		$('#chat-panel').show();
    	},
    	hideHeader : function(){
    		$('#header').hide();
    		$('#content-wrapper').css('padding-top', 0);
    	},
    	showHeader : function(){
    		$('#header').show();
    		$('#content-wrapper').css('padding-top', '3.5em');
    	},
    	focus : function(element){
    		$(element).focus();
    	},
    	focusMsgInput : function(){
    		if(!Chat.util.checkMobile()) {
    			Chat.ui.focus('#chat-msg-input');
    		}
    	},
    	getFirstConv : function(){
    		id = $("#app-navigation li:nth-child(2)").attr('id'); // conv-id-...
    		convId = id.substr(10, id.length); // strip conv-id-
    		return convId;
    	},
    	newMsg : function(convId){
    		$('#conv-new-msg-' + convId).fadeIn();
    		$('#conv-new-msg-' + convId).fadeOut();
    		this.newMsg(convId);
    	},
    	applyAvatar : function(user){
    		$('.icon-' + user).avatar(user, 32);
    	},
    	updateTitle : function(){
    		if(!Chat.tabActive){
    			$('title').text(Chat.tabTitle);
    		}
		},
    	clearTitle : function(){
			$('title').text('Chat - ownCloud');
    	},
    	alert : function(text){
    		OC.Notification.showHtml(text);
			setTimeout(function(){
                OC.Notification.hide();
			}, 2000);
    	}
         
    },
    util : {
    	generateSessionId : function(){
            var timestamp = "sessionID" + (new Date).getTime();
            var sessionID = md5(timestamp);
            return sessionID.toString();
    	},
    	generateConvId : function(){
            var timestamp = "conversation" + (new Date).getTime();
            var conversationID = md5(timestamp);
            return conversationID.toString();
    	},
    	timeStampToDate : function(timestamp){
            var date = new Date(timestamp*1000);
            var hours = date.getHours();
            var minutes = date.getMinutes();
            var seconds = date.getSeconds();
            return	{hours : date.getHours(), minutes : date.getMinutes(), seconds : date.getSeconds()};
    	},
    	countObjects : function(object){
            var count = 0;
            for (var k in object) {
                if (object.hasOwnProperty(k)) {
                   ++count;
                }
            }
            return count;
    	},
    	checkMobile : function(){
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    	},
    	quit : function(){
            $.ajax({
                type: "POST",
                url: OC.Router.generate("command_quit"),
                data: { user: OC.currentUser, sessionID : Chat.sessionId},
                async: false,
            });
    	},
        init : function(){
            Chat.scope = angular.element($("#chat-wrapper")).scope();
            Chat.ui.updateTitle();
            Chat.ui.showLoading();
            Chat.sessionId = Chat.util.generateSessionId();
            Chat.api.command.greet(function(){
                //TODO add getConversation function
                Chat.ui.clear();
                Chat.ui.showEmpty();
                Chat.api.util.longPoll();
                Chat.ui.alert('Connected to the chat server!');
            });
        },
        updateOnlineStatus : function(){
        	Chat.api.command.online();
        },
        titleHandler : function(){
        	Chat.ui.clearTitle();
    		setTimeout(function(){
    			Chat.ui.updateTitle();
    		}, 1000);
        }

    },
    api : {
    	command : {
            greet : function(success){
                // OK
                Chat.api.util.doRequest('greet', {"type" : "greet", "http_type" : "request", "data" : { "user" : OC.currentUser, "session_id" : Chat.sessionId, "timestamp" : (new Date).getTime() / 1000 }}, success);
            },
            join : function(convId, success){
                // OK
                Chat.api.util.doRequest('join', {"type" : "join", "http_type" : "request", "data" : { "conv_id": convId,  "timestamp" : (new Date).getTime() / 1000, "user" : OC.currentUser, "session_id" : Chat.sessionId }}, success);
            },
            invite : function(userToInvite, convId, success, error){
                // In progress
                Chat.api.util.doRequest('invite', {"type" : "invite", "http_type" : "request", "data" : { "conv_id" : convId, "timestamp" : (new Date).getTime() / 1000, "user_to_invite" : userToInvite , "user" : OC.currentUser, "session_id" : Chat.sessionId }},success,error);
            },
            sendChatMsg : function(msg, convId, success){
                Chat.api.util.doRequest('send', {"conversationID" : convId, "msg" : msg, "user" : OC.currentUser, "sessionID" : Chat.sessionId, "timestamp" : (new Date).getTime() / 1000   }, success);
            },
            leave : function(convId, success){
                Chat.api.util.doRequest('leave', {"conversationID" : convId, "user" : OC.currentUser, "sessionID" : Chat.sessionId, "timestamp" : (new Date).getTime() / 1000   }, success);
            },
            online : function(success){
            	Chat.api.util.doRequest('online', {"user" : OC.currentUser, "sessionID" : Chat.sessionId, "timestamp" : (new Date).getTime() / 1000   }, function(){});
            }
    	},
    	on : {
            invite : function(param){
                Chat.scope.$apply(function(){
                    Chat.scope.addConvToView(param.conversationID, param.user);
                }); 
                Chat.api.command.join(param.conversationID, function(){});
                Chat.ui.alert('You auto started a new conversation with ' + param.user);
            },
            chatMessage : function(param){
                Chat.scope.$apply(function(){
                    Chat.scope.addChatMsgToView(param.conversationID, param.user, param.msg, param.timestamp);	
                });
            },
            joined : function(param){
            	Chat.ui.alert('The user ' + param.user + ' joined this conversation');
            	Chat.scope.$apply(function(){
            		Chat.scope.convs[param.conversationID].name = Chat.scope.convs[param.conversationID].name + ' ' + param.user ;	
                });
            }
    	},
    	util : {
            doRequest : function(type, command, success, error){
                $.post(OC.Router.generate("chat_api_command", {type: type}), {command: JSON.stringify(command)}).done(function(response){
                	if(response.data.status === "success"){
                        success();
                    } else if (response.data.status === "error"){
                    	error(response.data.data.msg);
                    }
                });
            },
            longPoll : function(){
                this.getPushMessages(function(commands){
                Chat.api.util.deletePushMessages(commands.ids, function(){
                      $.each(commands.data, function(index, command){
                              Chat.api.util.handlePushMessage(command);
                      });
                      Chat.api.util.longPoll();
                  });
                });
            },
            handlePushMessage : function(command){
                if(command.http_type === "request"){
            		if (command.type === "invite"){
            			Chat.api.on.invite(command.data.param);
                    } else if (command.type === "send"){
                        Chat.api.on.chatMessage(command.data.param);
                    } else if (command.type === "joined"){
                        Chat.api.on.joined(command.data.param);
                    } /*else if (msg.data.type === "left"){
                            var conversationID = msg.data.param.conversationID;
                            getUsers(server, conversationID, function(msg){
                                    if (msg.data.param.users.length <= 1){
                                            deleteConversation(conversationID);
                                    }
                            });
                    }*/
                }
            },
            getPushMessages : function(success){
                    $.post(OC.Router.generate('push_get'), {"receiver" : OC.currentUser, "sessionID" : Chat.sessionId}, function(data){
                            success(data);
                    });
            },
            deletePushMessages : function(ids, callback){
                    $.post(OC.Router.generate('push_delete'), {ids: ids}, function(data){
                       callback();
                    });
            },
    	}
    },
}