/*
 * Copyright 2014, Gregg Tavares.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Gregg Tavares. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";

requirejs(
  [ 'hft/gameserver',
    'hft/gamesupport',
    'hft/misc/misc',
    'bower_components/jquery/dist/jquery.min.js'
  ], function(
    GameServer,
    GameSupport,
    Misc) {

	var $ = jQuery;

  // You can set these from the URL with
  // http://localhost:18679/games/<gameid>/gameview.html?settings={name:value,name:value}
  var globals = {
    haveServer: true,
    debug: false,
  };
  Misc.applyUrlSettings(globals);

  var server;
  if (globals.haveServer) {
    server = new GameServer();
    server.addEventListener('playerconnect', playerAdd);
  }

  GameSupport.init(server, globals);

	function playerAdd (p,title){
		console.log(p);
		p = new Player(p,title);
		p.socket.sendCmd("wait");
	}
	var Game = {};
	Game.players = {};
	Game.players.length = 0;
	Game.state = 0; // 0 Idling, 1 In Game
	Game.time = 30;
	Game.nextState = function(){
		Game.state = (Game.state+1)%2;
		Game.stateStart = Date.now();
		Game.time = 30;
		switch(Game.state){
			case 0: Game.resolveWinner(); break;
			case 1: Game.start(); break;
		}
	}
	Game.wait = function(reason){
		Game.time = 30;
		for(var i in Game.players){
			if(i == "length"){
				continue;
			}
			if(!Game.players[i]){ 
				break;
			}
			Game.players[i].socket.sendCmd("wait");
		}
		//show wait scene
		$(".wait").addClass("active").siblings().removeClass("active");
	}

	Game.start = function(reason){
		for(var i in Game.groups){
			Game.groups[i].reset();
		}
		for(i in Game.players){
			if(i == "length") continue;
			Game.players[i].socket.sendCmd("go");
		}
		$(".ingame").addClass("active").siblings().removeClass("active");
	}
	Game.resolveWinner = function(){
		var ari = Object.keys(Game.groups);
		ari.sort(function(a,b){
			var t = Game.groups[b].votes - Game.groups[a].votes;
			/*
			for now I want ties to be ok 
			while(t == 0 && Game.groups[a].vote_times > 0 && Game.groups[b].vote_times > 0){
				t = Game.groups[a].vote_times.shift() - Game.groups[b].vote_times.shift();
			}
			*/
			return t;
		});
		var win;
		if(Game.groups[ari[1]].votes == Game.groups[ari[0]].votes 
		&& Game.groups[ari[2]].votes == Game.groups[ari[0]].votes
		){
			if(Game.groups[ari[0]].votes == 0)
				$(".result h1").text("Everyone Left");
			else
				$(".result h1").text("Its a tie. Unfreakin-believable.");
			$(".result").addClass("active").siblings().removeClass("active");
		}else if(Game.groups[ari[1]].votes == 0){
			win = ari[0];
		}else if(Game.groups[ari[1]].num - Game.groups[ari[0]].num%3 == 1){
			win = ari[1];
		}else{
			win = ari[0];
		}
		for(var i in Game.players){
			if(i == "length") continue;
			if(typeof Game.players[i].group == "undefined"){
				Game.players[i].socket.sendCmd("wait");
			}else if(Game.players[i].group.title == win){
				Game.players[i].socket.sendCmd("win");
			}else {
				Game.players[i].socket.sendCmd("lose");
			}
			Game.players[i].reset();
		}
		$(".result h1").text(win+" won.");
		$(".result").addClass("active").siblings().removeClass("active");
	}

	/*
		Player Joins
			-They must wait until next game
		Next Game only starts with 2 or more people
		Idle for 30 seconds to gather
		Countdown: 5, 4, 3, 2, 1

		Players Choose where they want to be
			-We give hints as to whats going on
		
		The Result is finalized
			-Those involved see whether they've won or lost
		-game countsdown so long as there are 2 or more people
		
	*/

	function Player(socket, title){
		this.jointime = Date.now();
		this.uid = this.jointime+"|"+Math.random();
		Game.players[this.uid] = this;
		Game.players.length++;
		socket.uid = this.uid;
		this.socket = socket;
		this.title = title;
		this.reset();
		var that = this;
		socket.addEventListener('move', function(data){
			console.log("moving: "+JSON.stringify(data));
			if(Game.state != 1 || that.jointime > Game.stateStart) return;
			that.switchGroup(Game.groups[data.move]);
		});
	  socket.addEventListener('disconnect', function(){
			if(that.group){
				that.group.votes -= 1/that.numswitch;
			}
			delete Game.players[that.uid];
			Game.players.length--;
		});
	}

	Player.prototype.switchGroup = function(group){
		if(this.group && this.group == group)
			return;
		if(this.group){
			this.group.votes -= 1/this.numswitch;
		}
		this.numswitch++;
		this.group = group;
		this.group.votes += 1/this.numswitch;
		group.players.push(this);
	}
	
	Player.prototype.reset = function(){
		this.group = void(0);
		this.numswitch = 0;
	}

	function Group(title, num){
		this.title = title;
		this.num = num;
		this.reset();
	}
	Group.prototype.reset = function(){
		this.votes = 0;
		this.vote_times = [];
		this.playercount = 0;
	}
	Game.groups = {
		"rock": new Group("rock",1),
		"paper": new Group("paper",2),
		"scissors": new Group("scissors",3)
	};


  // Your init code goes here.

	var last = Date.now();
  var mainloop = function(diff) {
		var now = Date.now();
		var diff = now - last;
		last = now;
		if(Game.state == 0){
			if(Game.players.length < 2){
				Game.wait();
				return;
			}
		}
		Game.time -= diff/1000;
		if(Game.time <= 0){
			Game.nextState();
		}
		var t = Math.round(Game.time*1000).toString();
		$(".time .sec").text(t.substring(0,t.length-3));
		$(".time .ms").text(t.substring(t.length-3));
     // your game's main loop code goes here.
  };

  GameSupport.run(globals, mainloop);
});


