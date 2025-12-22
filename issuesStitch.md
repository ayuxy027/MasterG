1. the process of trdnaltion is very slow, we can maybe do batch processing line by line or try a hacky way for streaming rsponse
2. model currently focuses on gicing entire response at once, we can maybe try to get it to give response sentence by sentence or chunk by chunk
3. model takes 10 seeconds to genetare i.e by deepseek but translations takes 40 sec which is 4x as compared to what the generations takes
4. on refreshing, we completly wipe out session and session details, lets use local mongodb to store session and session details
5. pdf generation, below section of each language trsanlated, lets add a download pdf where we simply inject the translated content into pdf by appending it simply
6. lets store previous sessions as well in local mongodb