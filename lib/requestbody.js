
module.exports.readRequestBody = readRequestBody;

function readRequestBody(request, maxBytes, callback){
	var buffer = request.requestDataBuffer;
	var credentials = this.credentials;
	if(buffer){
		if(buffer.end){
			haveData();
		}else{
			request.addListener('end', haveData);
			request.resume();
		}
	}else{
		buffer = {data:''};
		// Alright, perhaps this function was called before we initialzed the request data buffer
		request.addListener('data', function(data){
			if(maxBytes && buffer.data.length>maxBytes) return;
			buffer.data += data;
		} );
		request.addListener('end', haveData);
		request.resume();
	}
	function haveData(){
		callback(null, buffer.data);
	}
}
