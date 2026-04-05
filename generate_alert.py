import wave
import struct
import math

sample_rate = 44100
duration = 0.15 # short beep
frequency = 880.0

obj = wave.open('public/alert.wav','w')
obj.setnchannels(1)
obj.setsampwidth(2)
obj.setframerate(sample_rate)

for i in range(int(duration * sample_rate)):
    # Simple sine wave with envelope (fade in/out)
    envelope = 1.0
    if i < 1000:
        envelope = i / 1000.0
    elif i > (duration * sample_rate) - 1000:
        envelope = ((duration * sample_rate) - i) / 1000.0
    
    value = int(32767.0 * envelope * math.sin(2.0 * math.pi * frequency * i / sample_rate))
    data = struct.pack('<h', value)
    obj.writeframesraw(data)

# Add silence
for i in range(int(0.1 * sample_rate)):
    data = struct.pack('<h', 0)
    obj.writeframesraw(data)

# Second beep
for i in range(int(duration * sample_rate)):
    envelope = 1.0
    if i < 1000:
        envelope = i / 1000.0
    elif i > (duration * sample_rate) - 1000:
        envelope = ((duration * sample_rate) - i) / 1000.0
        
    value = int(32767.0 * envelope * math.sin(2.0 * math.pi * frequency * i / sample_rate))
    data = struct.pack('<h', value)
    obj.writeframesraw(data)

obj.close()
