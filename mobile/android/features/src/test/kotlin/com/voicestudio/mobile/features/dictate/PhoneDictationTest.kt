package com.voicestudio.mobile.features.dictate

import com.voicestudio.mobile.local.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.test.*
import kotlinx.serialization.json.JsonObject
import org.junit.Assert.*
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class PhoneDictationTest {
    private val model=PhoneModel("stream","asr-stream","sherpa-onnx","test/model","a".repeat(40),emptyList(),0,listOf("en"),2.0,
        ModelLicence("MIT","commercial-ok",false,"holder","holder","b".repeat(64)),JsonObject(emptyMap()))
    private open class Engine : LocalEngine {
        override suspend fun synthesize(model: PhoneModel,text: String,speaker: Int,speed: Float,language: String?,progress: (Float)->Unit): LocalAudio = error("unused")
        override suspend fun clone(model: PhoneModel,text: String,reference: LocalAudio,referenceText: String,progress: (Float)->Unit): LocalAudio = error("unused")
        override suspend fun transcribe(model: PhoneModel,audio: LocalAudio,progress: (Float)->Unit): String = error("unused")
        override suspend fun translate(model: PhoneModel,text: String,targetLanguage: String,progress: (Float)->Unit): String = error("unused")
        override fun streamTranscribe(model: PhoneModel,audio: Flow<LocalAudio>) = flow {
            audio.collect {assertEquals(16000,it.sampleRate);assertEquals(2,it.samples.size);emit(Transcript("partial",false,0f))}
            emit(Transcript("complete",true,1f))
        }
    }
    @Test fun microphoneEndsGracefullyAndKeepsFinalTranscript() = runTest {
        val failures=mutableListOf<Throwable>()
        val controller=PhoneDictation(Engine(),this,{failures+=it},DictationAudioSource {_,send ->send(byteArrayOf(0,0,0,64),4)})
        controller.start(model);advanceUntilIdle()
        assertEquals("complete",controller.text.value);assertFalse(controller.active.value);assertTrue(failures.isEmpty())
    }
    @Test fun lifecycleCloseCancelsCaptureAndReleasesSource() = runTest {
        var released=false
        val source=DictationAudioSource {_,_ ->try {awaitCancellation()} finally {released=true}}
        val controller=PhoneDictation(Engine(),this,{throw it},source)
        controller.start(model);runCurrent();assertTrue(controller.active.value)
        controller.close();advanceUntilIdle();assertTrue(released);assertFalse(controller.active.value)
    }
    @Test fun completedPhoneTranscriptSurvivesControllerRecreation() = runTest {
        val transcript=MutableStateFlow("Earlier words")
        val source=DictationAudioSource {_,send ->send(byteArrayOf(0,0,0,64),4)}
        val first=PhoneDictation(Engine(),this,{throw it},source,transcript)
        assertEquals("Earlier words",first.text.value)
        first.start(model);advanceUntilIdle();first.close()
        val next=PhoneDictation(Engine(),this,{throw it},source,transcript)
        assertEquals("complete",next.text.value)
        transcript.value="Words from the computer"
        assertEquals("Words from the computer",next.text.value)
    }
    @Test fun closedSessionCannotReportLateDecoderFailureOnAnotherRoute() = runTest {
        val errors=mutableListOf<Throwable>()
        val entered=CompletableDeferred<Unit>()
        val engine=object:Engine() {
            override fun streamTranscribe(model:PhoneModel,audio:Flow<LocalAudio>)=flow<Transcript> {
                entered.complete(Unit)
                try {awaitCancellation()}
                finally {withContext(NonCancellable) {throw IllegalStateException("Old decoder cleanup")}}
            }
        }
        val controller=PhoneDictation(engine,this,{errors+=it},DictationAudioSource {_,_->})
        controller.start(model);runCurrent();entered.await()
        controller.close();advanceUntilIdle()
        assertTrue(errors.toString(),errors.isEmpty())
        assertFalse(controller.active.value)
    }
}
