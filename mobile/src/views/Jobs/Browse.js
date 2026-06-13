import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { api } from "../../api/api";
import { useLanguage } from "../../LanguageContext";
import { getUserSession } from "../../utils/userSession";
import { formatRelativeDate, formatJobDate } from "./jobDate";
import { C, StatusBadge } from "./jobsUI";
import AppIcon from "../../icons/AppIcon";

const T = {
  en:{search:"Search jobs…",empty:"No jobs found.",loading:"Finding jobs…"},
  sw:{search:"Tafuta kazi…",empty:"Hakuna kazi.",loading:"Inatafuta…"},
};

function toJobRow(job){
  const p=job.poster||{};
  return{...job,code:job.job_code||job.code||"JOB",service:job.service_type||"",
    postedAt:formatRelativeDate(job.created_at),deadline:formatJobDate(job.tender_closes_at),
    posterUsername:p.username||job.poster_username||"",
    applicants:Number(job.applicant_count||0),statusLabel:String(job.status||"open").replace(/_/g," ")};
}

export default function BrowseJobs(){
  const nav=useNavigation();
  const {language}=useLanguage();const t=T[language]||T.en;
  const [search,setSearch]=useState("");
  const [jobs,setJobs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);

  const load=useCallback(async()=>{
    try{
      const session=await getUserSession();
      const me=session.profile?.uuid||session.user?.uuid||null;
      const res=await api.get("/hiring/requests",{params:{q:search.trim()||undefined,scope:"browse"}});
      setJobs((res?.data?.jobs||[]).filter(j=>{
        const o=j.created_by||j.client_user_uuid||j.poster_uuid||j.poster?.uuid;
        const isDirect = j.hire_type === "direct" || !!j.target_provider_uuid || !!j.direct_status;
        return !isDirect&&!j.has_applied&&["open","applied"].includes(j.status)&&!(o&&me&&o===me);
      }).map(toJobRow));
    }catch(e){console.log("browse error",e?.message);}
    finally{setLoading(false);setRefreshing(false);}
  },[search]);

  useFocusEffect(useCallback(()=>{setLoading(true);load();},[load]));

  const filtered=jobs.filter(j=>{
    const q=search.toLowerCase().trim();if(!q)return true;
    return [j.title,j.code,j.location,j.service].some(v=>String(v||"").toLowerCase().includes(q));
  });

  if(loading)return(
    <View style={s.center}>
      <ActivityIndicator color={C.teal} size="large"/>
      <Text style={s.loadTxt}>{t.loading}</Text>
    </View>
  );

  return(
    <View style={s.safe}>
      <View style={s.searchWrap}>
        <AppIcon name="search" size={18} color={C.slate}/>
        <TextInput style={s.searchInput} placeholder={t.search} placeholderTextColor={C.slate} value={search} onChangeText={setSearch}/>
        {search?<TouchableOpacity onPress={()=>setSearch("")}><AppIcon name="x" size={16} color={C.slate}/></TouchableOpacity>:null}
      </View>
      <FlatList
        data={filtered} keyExtractor={i=>String(i.id)} showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.teal} onRefresh={()=>{setRefreshing(true);load();}}/>}
        renderItem={({item})=>(
          <TouchableOpacity style={s.card} activeOpacity={0.88} onPress={()=>nav.navigate("RequestDetails",{job:item})}>
            <View style={s.cardTop}>
              <View style={s.codePill}><Text style={s.codeText}>{item.code}</Text></View>
              <StatusBadge status={item.statusLabel} size="sm"/>
            </View>
            <Text style={s.title} numberOfLines={2}>{item.title}</Text>
            <View style={s.metaRow}><AppIcon name="map-pin" size={12} color={C.slate}/><Text style={s.meta} numberOfLines={1}>{item.location||"Location not set"}</Text></View>
            {item.posterUsername?<View style={s.metaRow}><AppIcon name="user" size={12} color={C.slate}/><Text style={s.meta}>@{item.posterUsername}</Text></View>:null}
            <View style={s.cardFooter}>
              <View style={s.metaRow}><AppIcon name="calendar" size={12} color={C.slate}/><Text style={s.metaSm}>Posted {item.postedAt||"Today"}</Text></View>
              {item.deadline?<View style={s.metaRow}><AppIcon name="calendar" size={12} color={C.slate}/><Text style={s.metaSm}>Closes {item.deadline}</Text></View>:null}
              <View style={s.applicantPill}><Text style={s.applicantTxt}>{item.applicants} applicant{item.applicants===1?"":"s"}</Text></View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={s.empty}><AppIcon name="briefcase" size={36} color={C.slate}/><Text style={s.emptyTxt}>{t.empty}</Text></View>}
      />
    </View>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  center:{flex:1,alignItems:"center",justifyContent:"center",gap:12},
  loadTxt:{color:C.slate,fontSize:14,fontWeight:"600"},
  searchWrap:{flexDirection:"row",alignItems:"center",gap:10,margin:16,paddingHorizontal:14,paddingVertical:11,backgroundColor:C.white,borderRadius:14,borderWidth:1,borderColor:"#EEF0F4",shadowColor:"#000",shadowOffset:{width:0,height:2},shadowOpacity:0.05,shadowRadius:6,elevation:2},
  searchInput:{flex:1,fontSize:15,color:"#1A1A2E"},
  list:{paddingHorizontal:16,paddingBottom:100,gap:10},
  card:{backgroundColor:C.white,borderRadius:16,padding:14,borderWidth:1,borderColor:"#EEF0F4",shadowColor:"#000",shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:8,elevation:2,gap:6},
  cardTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:2},
  codePill:{backgroundColor:C.tealLight,paddingHorizontal:8,paddingVertical:3,borderRadius:8},
  codeText:{color:C.teal,fontSize:11,fontWeight:"800"},
  title:{fontSize:16,fontWeight:"800",color:"#1A1A2E",lineHeight:22},
  metaRow:{flexDirection:"row",alignItems:"center",gap:5},
  meta:{color:C.slate,fontSize:13,fontWeight:"500",flex:1},
  metaSm:{color:C.slate,fontSize:12},
  cardFooter:{flexDirection:"row",alignItems:"center",gap:12,marginTop:4,flexWrap:"wrap"},
  applicantPill:{marginLeft:"auto",backgroundColor:C.blueLight,paddingHorizontal:8,paddingVertical:3,borderRadius:8},
  applicantTxt:{color:C.blue,fontSize:11,fontWeight:"700"},
  empty:{alignItems:"center",paddingTop:60,gap:12},
  emptyTxt:{color:C.slate,fontSize:15,fontWeight:"600"},
});
