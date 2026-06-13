/**
 * JobApplicantDetails.js - redesigned
 * Shown to hirer when reviewing a provider's application.
 * After hiring: shows "Open Workspace" button.
 */
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, StatusBar } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../../theme";
import { useLanguage } from "../../../LanguageContext";
import AppIcon from "../../../icons/AppIcon";
import { viewerRequest } from "../../../api/api";
import { formatJobDate, formatRelativeDate } from "../jobDate";
import HiringNoticeModal from "../HiringNoticeModal";
import { C, NavHeader, SectionHeading, Card, PrimaryButton, OutlineButton, InfoRow } from "../jobsUI";

const T={
  en:{budget:"Budget",time:"Est. Time",available:"Available From",experience:"Experience",howIWork:"How I'll do this",workImages:"Previous Work / Tools",notes:"Additional Notes",jobInfo:"Job Info",hire:"Hire This Provider",openWorkspace:"Open Job Workspace",closed:"Request Closed",confirmTitle:"Hire provider?",confirmBack:"Cancel",confirmHire:"Hire",hired:"Provider hired!",errHire:"Could not hire",noRating:"Not rated yet"},
  sw:{budget:"Bajeti",time:"Muda",available:"Anapatikana",experience:"Uzoefu",howIWork:"Jinsi nitakavyofanya",workImages:"Kazi Zilizopita / Zana",notes:"Maelezo ya Ziada",jobInfo:"Taarifa ya Kazi",hire:"Mwajiri Mtoa Huduma",openWorkspace:"Fungua Workspace",closed:"Imefungwa",confirmTitle:"Mwajiri?",confirmBack:"Rudi",confirmHire:"Mwajiri",hired:"Ameajiriwa!",errHire:"Imeshindikana",noRating:"Hakuna ukadiriaji"},
};

function formatBudget(v){const r=String(v||"").trim();if(!r)return"Not set";if(/^TZS\b/i.test(r))return r;const n=r.replace(/[^\d.]/g,"");return n?`TZS ${Number(n).toLocaleString("en-US")}`:r;}
function avatarUri(u){if(u?.profilePic||u?.profile_pic)return u.profilePic||u.profile_pic;return`https://ui-avatars.com/api/?name=${encodeURIComponent(u?.username||"P")}&background=0B6B63&color=fff&bold=true&rounded=true`;}

export default function JobApplicantDetails(){
  const nav=useNavigation();const route=useRoute();
  const {theme,mode}=useAppTheme();const {language}=useLanguage();const t=T[language]||T.en;
  const insets=useSafeAreaInsets();
  const [hiring,setHiring]=useState(false);
  const [notice,setNotice]=useState(null);
  const [detailJob,setDetailJob]=useState(null);
  const [hired,setHired]=useState(false);

  const request=route.params?.request||null;
  const provider=request?.provider;
  const jobId=request?.job?.id;

  useEffect(()=>{
    if(!jobId)return;
    let cancelled=false;
    viewerRequest("get",`/hiring/jobs/${jobId}`).then(res=>{
      if(!cancelled&&res?.data?.job){
        setDetailJob(res.data.job);
        const j=res.data.job;
        if(["filled","active","start_pending","working","completion_pending","completed","closed"].includes(j.status))setHired(true);
      }
    }).catch(()=>{});
    return()=>{cancelled=true;};
  },[jobId]);

  if(!request||!provider||!request.job){
    return(
      <SafeAreaView style={s.safe} edges={["top"]}>
        <NavHeader title={t.screenTitle||"Provider Request"} onBack={()=>nav.goBack()}/>
        <View style={s.center}><Text style={s.notFoundTxt}>Request not available</Text></View>
      </SafeAreaView>
    );
  }

  const isClosed=request.status==="closed";
  const BOTTOM=80+insets.bottom;

  const hireProvider=()=>{
    if(isClosed){setNotice({type:"error",title:t.closed});return;}
    setNotice({
      type:"confirm",title:t.confirmTitle,
      body:`Hire @${provider.username} for "${request.job.title}"?`,
      primaryLabel:t.confirmHire,secondaryLabel:t.confirmBack,
      onPrimary:async()=>{
        try{
          setHiring(true);
          await viewerRequest("post",`/hiring/jobs/${request.job.id}/assign`,{profile_uuid:provider.uuid});
          setHired(true);
          setNotice({type:"success",title:t.hired,body:`@${provider.username} has been assigned. A job workspace has been created.`,onPrimary:()=>nav.navigate("JobWorkspace", {
            jobId: request.job.id,
            jobCode: request.job.code,
          })});
        }catch(e){setNotice({type:"error",title:t.errHire,body:e?.response?.data?.message||"Please try again."});}
        finally{setHiring(false);}
      },
    });
  };

  return(
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar barStyle={mode==="dark"?"light-content":"dark-content"} backgroundColor={C.white}/>
      <NavHeader title="Provider Request" onBack={()=>nav.goBack()}/>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scroll,{paddingBottom:BOTTOM+16}]}>

        {/* Provider profile card */}
        <View style={s.profileBanner}>
          <Image source={{uri:avatarUri(provider)}} style={s.avatar}/>
          <Text style={s.provUsername}>@{provider.username}</Text>
          <Text style={s.provFull}>{provider.fullName||""}</Text>
          <View style={s.ratingRow}>
            {provider.rating
              ?<><AppIcon name="star" size={14} color={C.amber}/><Text style={s.ratingTxt}>{provider.rating}</Text></>
              :<Text style={s.ratingTxt}>{t.noRating}</Text>}
          </View>
          {provider.services?.length?(
            <View style={s.serviceChips}>
              {(Array.isArray(provider.services)?provider.services:[provider.services]).filter(Boolean).map((sv,i)=>(
                <View key={i} style={s.serviceChip}><Text style={s.serviceChipTxt}>{sv}</Text></View>
              ))}
            </View>
          ):null}
        </View>

        {/* How I'll do it */}
        <Card>
          <SectionHeading label={t.howIWork}/>
          <Text style={s.bodyTxt}>{request.explanation||"No explanation provided."}</Text>
        </Card>

        {/* Offer grid */}
        <Card>
          <SectionHeading label="Offer summary"/>
          <View style={s.infoGrid}>
            {[{l:t.budget,v:formatBudget(request.budget)},{l:t.time,v:request.duration||"Not set"},{l:t.available,v:request.availableFrom||"Not set"},{l:t.experience,v:request.experience||"Not set"}].map(r=>(
              <View key={r.l} style={s.infoBox}>
                <Text style={s.infoLbl}>{r.l}</Text>
                <Text style={s.infoVal}>{r.v}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Work images */}
        {request.images?.length?(
          <Card>
            <SectionHeading label={t.workImages}/>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:10,paddingRight:4}}>
              {request.images.map((uri,i)=><Image key={`${uri}-${i}`} source={{uri}} style={s.workImg}/>)}
            </ScrollView>
          </Card>
        ):null}

        {/* Notes */}
        {request.notes?(
          <Card><SectionHeading label={t.notes}/><Text style={s.bodyTxt}>{request.notes}</Text></Card>
        ):null}

        {/* Job mini card */}
        <Card style={s.jobMini}>
          <SectionHeading label={t.jobInfo}/>
          <View style={s.jobCodeRow}>
            <View style={s.jobCodePill}><Text style={s.jobCodeTxt}>{request.job.code}</Text></View>
          </View>
          <Text style={s.jobTitle}>{request.job.title}</Text>
          <InfoRow icon="map-pin" label="Location" value={request.job.location||"Not set"}/>
          <InfoRow icon="calendar" label="Posted" value={formatRelativeDate(request.job.postedAt)||"Today"}/>
        </Card>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={[s.bottomBar,{paddingBottom:insets.bottom+14}]}>
        {hired?(
          <PrimaryButton label={t.openWorkspace} icon="message"
            onPress={()=>nav.navigate("JobWorkspace", {
              jobId: request.job.id,
              jobCode: request.job.code,
            })}/>
        ):(
          <PrimaryButton
            label={isClosed?t.closed:t.hire} icon={isClosed?"lock":"check"}
            disabled={isClosed||hiring} loading={hiring}
            onPress={hireProvider}/>
        )}
      </View>

      <HiringNoticeModal visible={!!notice} type={notice?.type} title={notice?.title} body={notice?.body}
        primaryLabel={notice?.primaryLabel} secondaryLabel={notice?.secondaryLabel}
        loading={hiring}
        onPrimary={async()=>{const n=notice;if(n?.onPrimary)await n.onPrimary();else setNotice(null);}}
        onSecondary={()=>setNotice(null)} onClose={()=>setNotice(null)}/>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  center:{flex:1,alignItems:"center",justifyContent:"center"},
  notFoundTxt:{fontSize:17,fontWeight:"700",color:"#1A1A2E"},
  scroll:{padding:16,gap:12},
  profileBanner:{backgroundColor:C.white,borderRadius:20,padding:24,alignItems:"center",gap:8,borderWidth:1,borderColor:"#EEF0F4",shadowColor:"#000",shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:8,elevation:3},
  avatar:{width:96,height:96,borderRadius:48,borderWidth:3,borderColor:C.tealLight,marginBottom:4},
  provUsername:{fontSize:20,fontWeight:"800",color:"#1A1A2E"},
  provFull:{fontSize:13,color:C.slate},
  ratingRow:{flexDirection:"row",alignItems:"center",gap:4},
  ratingTxt:{fontSize:13,fontWeight:"700",color:C.amber},
  serviceChips:{flexDirection:"row",flexWrap:"wrap",gap:6,justifyContent:"center",marginTop:4},
  serviceChip:{backgroundColor:C.tealLight,paddingHorizontal:10,paddingVertical:4,borderRadius:20},
  serviceChipTxt:{color:C.teal,fontSize:12,fontWeight:"700"},
  bodyTxt:{fontSize:14,color:C.slate,lineHeight:22},
  infoGrid:{flexDirection:"row",flexWrap:"wrap",gap:10},
  infoBox:{width:"47%",backgroundColor:C.slateLight,borderRadius:12,padding:14,borderWidth:1,borderColor:"#EEF0F4"},
  infoLbl:{color:C.slate,fontSize:11,fontWeight:"700",marginBottom:4},
  infoVal:{color:"#1A1A2E",fontSize:15,fontWeight:"800"},
  workImg:{width:140,height:110,borderRadius:12,backgroundColor:C.slateLight},
  jobMini:{backgroundColor:C.tealLight,borderColor:C.tealMid},
  jobCodeRow:{marginBottom:6},
  jobCodePill:{backgroundColor:C.white,paddingHorizontal:8,paddingVertical:3,borderRadius:8,alignSelf:"flex-start"},
  jobCodeTxt:{color:C.teal,fontSize:11,fontWeight:"800"},
  jobTitle:{fontSize:17,fontWeight:"800",color:"#1A1A2E",marginBottom:4},
  bottomBar:{borderTopWidth:1,borderTopColor:"#EEF0F4",paddingHorizontal:16,paddingTop:14,backgroundColor:C.white},
});
