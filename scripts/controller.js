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

// Start the main app logic.
requirejs(
  [ 'hft/gameclient',
    'hft/commonui',
    'hft/misc/misc',
    'hft/misc/mobilehacks',
		'bower_components/jquery/dist/jquery.min.js'
  ], function(
    GameClient,
    CommonUI,
    Misc,
    MobileHacks) {
  var g_client;

  var globals = {
    debug: false,
  };
  Misc.applyUrlSettings(globals);
  MobileHacks.fixHeightHack();

  g_client = new GameClient();

  CommonUI.setupStandardControllerUI(g_client, globals);
	var $ = jQuery;

	console.log(typeof g_client);
  g_client.addEventListener('win', function(){
		console.log("win");
		$("#win").addClass("selected").siblings().removeClass("selected");
	});
  g_client.addEventListener('lose', function(){
		console.log("lose");
		$("#lose").addClass("selected").siblings().removeClass("selected");
	});
  g_client.addEventListener('wait', function(){
		$("#wait").addClass("selected").siblings().removeClass("selected");
	});
  g_client.addEventListener('go', function(){
		$("#buttons").addClass("selected").siblings().removeClass("selected");
	});

	var cur_sel = 0;

	function domove(e){
		e.preventDefault();
		var $t = $(this);
		$t.siblings().removeClass("selected");
		$t.addClass("selected");
		var num = $t.attr("data-move");
		cur_sel = num;
	  g_client.sendCmd('move', {move: num});
	}
	$("#buttons>button").on("click",domove);
});


